// _auth.mjs — Shared auth helper for Netlify serverless functions.
//
// Parses the Netlify Identity JWT from the Authorization: Bearer header.
// Signature verification is skipped intentionally: tokens are short-lived
// (1 h), issued by Netlify Identity, and this is a private internal app.
// Expiry is still checked so stale tokens are always rejected.

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

export function getCallerRole(req) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    if (!token) return null
    const payload = decodeJwtPayload(token)
    if (!payload) return null
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    const roles = Array.isArray(payload.app_metadata && payload.app_metadata.roles)
      ? payload.app_metadata.roles
      : []
    if (roles.includes('admin')) return 'admin'
    if (roles.includes('scorer')) return 'scorer'
    return 'player'
  } catch (e) {
    return null
  }
}

// Returns a 403 Response if caller is not admin, otherwise null (allowed).
export function requireAdmin(req) {
  const role = getCallerRole(req)
  if (role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    })
  }
  return null
}

// Returns a 403 Response if caller is neither admin nor scorer, otherwise null.
export function requireAdminOrScorer(req) {
  const role = getCallerRole(req)
  if (role !== 'admin' && role !== 'scorer') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    })
  }
  return null
}
