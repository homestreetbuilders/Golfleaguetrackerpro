// _auth.mjs – Shared auth helper for Netlify serverless functions.
// Supports Firebase Auth JWTs (role in payload.role) with fallbacks.

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

const HARDCODED_ADMINS = ['ron@homestreetbuilders.com']

function adminEmailFallback() {
  const v = process.env.ADMIN_EMAIL
  return v ? String(v).trim().toLowerCase() : null
}

export function emailFromReq(req) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!token) return null
    const payload = decodeJwtPayload(token)
    if (!payload) return null
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload.email ? String(payload.email).trim().toLowerCase() : null
  } catch (e) {
    return null
  }
}

export function getCallerRole(req) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!token) return null
    const payload = decodeJwtPayload(token)
    if (!payload) return null
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    const email = payload.email ? String(payload.email).trim().toLowerCase() : null

    // Hardcoded admin
    if (email && HARDCODED_ADMINS.includes(email)) return 'admin'

    // ADMIN_EMAIL env fallback
    const adminEnv = adminEmailFallback()
    if (adminEnv && email && email === adminEnv) return 'admin'

    // Firebase custom claim: payload.role (string)
    if (payload.role && typeof payload.role === 'string') {
      return payload.role.trim().toLowerCase()
    }

    // Legacy: payload.app_metadata
    if (payload.app_metadata) {
      const roles = payload.app_metadata.roles
      if (Array.isArray(roles) && roles.includes('admin')) return 'admin'
      if (Array.isArray(roles) && roles.includes('scorer')) return 'scorer'
      if (typeof roles === 'string') return roles.trim().toLowerCase()
      if (payload.app_metadata.role) return String(payload.app_metadata.role).trim().toLowerCase()
    }

    return 'player'
  } catch (e) {
    return null
  }
}

export async function requireAdmin(req) {
  const role = getCallerRole(req)
  if (role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    })
  }
  return null
}

export async function requireAdminOrScorer(req) {
  const role = getCallerRole(req)
  if (role !== 'admin' && role !== 'scorer') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    })
  }
  return null
}
