// bootstrap-admin.mjs
// One-time endpoint to grant admin role to the calling user.
//
// Safe conditions — grants admin if ANY of these are true:
//   1. Zero admin accounts exist in the system (first-admin-wins, no secret needed)
//   2. A BOOTSTRAP_SECRET env var is set and ?secret= matches it
//
// Once an admin exists, condition 1 no longer applies. The role is written
// to Netlify Blobs so all future auth checks find it normally.

import { getStore } from '@netlify/blobs'
import { emailFromReq } from './_auth.mjs'

export default async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Extract caller email from JWT
  const email = emailFromReq(req)
  if (!email) {
    return Response.json({
      error: 'Not authenticated',
      hint: 'Run this from the browser console while logged in to the app: ' +
            'const t = await netlifyIdentity.currentUser().jwt(); ' +
            'fetch("/api/bootstrap-admin", {headers:{Authorization:"Bearer "+t}}).then(r=>r.json()).then(console.log)'
    }, { status: 401 })
  }

  const store = getStore('user-roles')

  // Check if caller is already admin
  const existingRole = await store.get(`role-${email}`, { type: 'text' }).catch(() => null)
  if (existingRole === 'admin') {
    return Response.json({ success: true, email, role: 'admin', note: 'Already admin — no change needed' })
  }

  // Condition 1: zero admins in the system → safe to bootstrap
  const { blobs } = await store.list().catch(() => ({ blobs: [] }))
  const adminCount = (blobs || []).filter(b => b && b.key && String(b.key).startsWith('role-')).length
  // Read each to count actual admins
  let hasAnyAdmin = false
  for (const blob of (blobs || [])) {
    if (!blob || !blob.key || !String(blob.key).startsWith('role-')) continue
    const r = await store.get(blob.key, { type: 'text' }).catch(() => null)
    if (r === 'admin') { hasAnyAdmin = true; break }
  }

  // Condition 2: secret matches BOOTSTRAP_SECRET env var
  const secret = process.env.BOOTSTRAP_SECRET ? String(process.env.BOOTSTRAP_SECRET).trim() : null
  const url = new URL(req.url)
  const provided = (url.searchParams.get('secret') || '').trim()
  const secretMatches = secret && provided && provided === secret

  if (!hasAnyAdmin || secretMatches) {
    await store.set(`role-${email}`, 'admin')
    console.log('[bootstrap-admin] Granted admin to', email, hasAnyAdmin ? '(secret matched)' : '(no admins existed)')
    return Response.json({ success: true, email, role: 'admin', note: 'Admin role granted' })
  }

  return Response.json({
    error: 'An admin already exists. Provide ?secret=BOOTSTRAP_SECRET to force-grant admin.',
    email
  }, { status: 403 })
}

export const config = {
  path: '/api/bootstrap-admin'
}
