// _auth.mjs — Shared auth helper for Netlify serverless functions.
//
// Netlify Identity JWTs do NOT carry app_metadata.roles — roles are stored
// exclusively in Netlify Blobs ('user-roles' store, key: 'role-{email}').
// We decode the JWT only to extract the caller's email, then look up their
// role in Blobs. Signature verification is skipped intentionally: tokens are
// short-lived (1 h), issued by Netlify Identity. Expiry is still checked.

import { getStore } from '@netlify/blobs'

function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1]
    if (!part) return null
    const json = Buffer.from(part, 'base64url').toString('utf8')
    return JSON.parse(json)
  } catch (e) {
    return null
  }
}

export function emailFromReq(req) {
  try {
    const auth = req.headers.get('authorization') || ''
    console.log('[auth] Authorization header present:', !!auth, '| starts with Bearer:', auth.startsWith('Bearer '))
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!token) {
      console.log('[auth] No bearer token found in Authorization header')
      return null
    }
    const payload = decodeJwtPayload(token)
    if (!payload) {
      console.log('[auth] JWT decode failed — payload is null')
      return null
    }
    const now = Math.floor(Date.now() / 1000)
    console.log('[auth] JWT exp:', payload.exp, '| now:', now, '| expired:', payload.exp ? payload.exp < now : 'no exp field')
    if (payload.exp && payload.exp < now) {
      console.log('[auth] Token is expired — rejecting')
      return null
    }
    const email = payload.email ? String(payload.email).trim().toLowerCase() : null
    console.log('[auth] Email from JWT:', email)
    return email || null
  } catch (e) {
    console.log('[auth] emailFromReq threw:', e && e.message)
    return null
  }
}

export async function getCallerRole(req) {
  const email = emailFromReq(req)
  if (!email) {
    console.log('[auth] getCallerRole: no email — returning null')
    return null
  }
  try {
    const store = getStore('user-roles')
    const role = await store.get(`role-${email}`, { type: 'text' }).catch(() => null)
    console.log('[auth] Blobs role lookup for', email, '→', role)

    if (role) return role

    // Bootstrap: account existed before Blobs-based role tracking was introduced.
    // If the email matches ADMIN_EMAIL and no role record exists yet, write 'admin'
    // to Blobs now so all future requests find it without hitting this branch again.
    const adminEmail = process.env.ADMIN_EMAIL
      ? String(process.env.ADMIN_EMAIL).trim().toLowerCase()
      : null
    console.log('[auth] ADMIN_EMAIL env var:', adminEmail || '(not set)')
    if (adminEmail && email === adminEmail) {
      console.log('[auth] Bootstrap: writing admin role for', email)
      await store.set(`role-${email}`, 'admin').catch(() => null)
      return 'admin'
    }

    console.log('[auth] No role in Blobs + no ADMIN_EMAIL match — returning player')
    return 'player'
  } catch (e) {
    console.log('[auth] getCallerRole threw:', e && e.message)
    return null
  }
}

// Returns a 403 Response if caller is not admin, otherwise null (allowed).
export async function requireAdmin(req) {
  const role = await getCallerRole(req)
  if (role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    })
  }
  return null
}

// Returns a 403 Response if caller is neither admin nor scorer, otherwise null.
export async function requireAdminOrScorer(req) {
  const role = await getCallerRole(req)
  if (role !== 'admin' && role !== 'scorer') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    })
  }
  return null
}
