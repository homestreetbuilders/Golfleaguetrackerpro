// _auth.mjs — Shared auth helper for Netlify serverless functions.
//
// Roles are stored in GoTrue users as app_metadata.roles (array preferred).
// The JWT echoes app_metadata — we derive role from what the JWT actually carries.
//
// Fallbacks supported:
//   - ADMIN_EMAIL — env var forcing admin for exactly that lowercase email (emergency / ops bootstrap)
//   - app_metadata.role as single string or roles as comma-separated string (legacy quirks)

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

/** @param {unknown} meta */
export function normalizedRolesFromAppMeta(meta) {
  const out = new Set()
  if (!meta || typeof meta !== 'object') return out
  const m = /** @type {Record<string, unknown>} */ (meta)
  if (typeof m.roles === 'string' && m.roles.trim()) {
    for (const s of String(m.roles).split(/[\s,;]+/).map(r => r.trim().toLowerCase()).filter(Boolean)) out.add(s)
  }
  if (Array.isArray(m.roles)) {
    for (const r of m.roles) {
      if (typeof r === 'string' && r.trim()) out.add(r.trim().toLowerCase())
    }
  }
  if (typeof m.role === 'string' && m.role.trim()) out.add(String(m.role).trim().toLowerCase())
  return out
}

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
    const adminEnv = adminEmailFallback()
    if (adminEnv && email && email === adminEnv) return 'admin'

    const fromMeta = normalizedRolesFromAppMeta(payload.app_metadata)
    // Netlify JWTs sometimes omit app_metadata.roles but include a numeric role id —
    // that id is meaningless here; rely on ADMIN_EMAIL above or proper app_metadata.roles.
    const topRole = typeof payload.role === 'string' ? payload.role.trim().toLowerCase() : ''
    const names = [...fromMeta]
    if (topRole) names.push(topRole)

    if (names.some(r => r === 'admin')) return 'admin'
    if (names.some(r => r === 'scorer')) return 'scorer'
    return 'player'
  } catch (e) {
    return null
  }
}

// Returns a 403 Response if caller is not admin, otherwise null (allowed).
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

// Returns a 403 Response if caller is neither admin nor scorer, otherwise null.
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
