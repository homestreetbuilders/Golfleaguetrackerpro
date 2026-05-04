import { getStore } from '@netlify/blobs'
import { requireAdmin, requireAdminOrScorer } from './_auth.mjs'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function leagueStoreName(base, leagueId) {
  const id = normalizeLeagueId(leagueId)
  return id ? `${base}-${id}` : base
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })
  const store = getStore(leagueStoreName('players', leagueId))

  if (req.method === 'GET') {
    const includeRoles = url.searchParams.get('includeRoles') === '1'
    const roleStore = includeRoles ? getStore(leagueStoreName('user-roles', leagueId)) : null

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const players = []

    for (const blob of blobs || []) {
      const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
      if (!data || !data.email) continue

      const pNum = (v) => (v !== undefined && v !== null) ? parseFloat(v) : null
      const pNumFin = (v) => { const n = pNum(v); return Number.isFinite(n) ? n : null }
      const p = {
        name: data.name || '',
        email: normalizeEmail(data.email),
        phone: data.phone || '',
        handicap: pNumFin(data.handicap),
        // Legacy 9/18 hole fields (from previous session)
        hdcp9:  pNumFin(data.hdcp9),
        hdcp18: pNumFin(data.hdcp18),
        // New typed handicaps (auto-calculated via USGA formula)
        hcpFront9: pNumFin(data.hcpFront9),
        hcpBack9:  pNumFin(data.hcpBack9),
        hcp18:     pNumFin(data.hcp18),
        // Override flags and values
        hcpFront9Override:      Boolean(data.hcpFront9Override),
        hcpFront9OverrideValue: pNumFin(data.hcpFront9OverrideValue),
        hcpBack9Override:       Boolean(data.hcpBack9Override),
        hcpBack9OverrideValue:  pNumFin(data.hcpBack9OverrideValue),
        hcp18Override:          Boolean(data.hcp18Override),
        hcp18OverrideValue:     pNumFin(data.hcp18OverrideValue),
        updatedAt: data.updatedAt || null,
        createdAt: data.createdAt || null
      }

      if (includeRoles && roleStore) {
        const roleKey = `role-${p.email}`
        const role = await roleStore.get(roleKey, { type: 'text' }).catch(() => null)
        p.role = role || 'player'
      }

      players.push(p)
    }

    players.sort((a, b) => String(a.name).localeCompare(String(b.name)))
    return Response.json({ players })
  }

  if (req.method === 'POST') {
    const authErr = requireAdminOrScorer(req)
    if (authErr) return authErr
    const body = await req.json().catch(() => null)
    const email = normalizeEmail(body && body.email)
    const name = body && body.name ? String(body.name).trim() : ''

    if (!email || !name) {
      return new Response('Missing name or email', { status: 400 })
    }

    const key = `player-${email}`
    const existing = await store.get(key, { type: 'json' }).catch(() => null)

    const parseOptional = (val, fallback) =>
      val !== undefined && val !== null && String(val).trim() !== ''
        ? parseFloat(val) : fallback

    // Per-type handicap override handling
    const parseBool = (v, fallback) => v !== undefined ? Boolean(v) : fallback
    const hcpFront9Override      = parseBool(body && body.hcpFront9Override,      !!(existing && existing.hcpFront9Override))
    const hcpBack9Override       = parseBool(body && body.hcpBack9Override,       !!(existing && existing.hcpBack9Override))
    const hcp18Override          = parseBool(body && body.hcp18Override,          !!(existing && existing.hcp18Override))
    const hcpFront9OverrideValue = parseOptional(body && body.hcpFront9OverrideValue, (existing && existing.hcpFront9OverrideValue) ?? null)
    const hcpBack9OverrideValue  = parseOptional(body && body.hcpBack9OverrideValue,  (existing && existing.hcpBack9OverrideValue)  ?? null)
    const hcp18OverrideValue     = parseOptional(body && body.hcp18OverrideValue,     (existing && existing.hcp18OverrideValue)     ?? null)

    const updated = {
      ...(existing || {}),
      name,
      email,
      phone: body && body.phone ? String(body.phone).trim() : (existing && existing.phone) || '',
      handicap: parseOptional(body && body.handicap, (existing && existing.handicap) ?? null),
      hdcp9:    parseOptional(body && body.hdcp9,    (existing && existing.hdcp9)    ?? null),
      hdcp18:   parseOptional(body && body.hdcp18,   (existing && existing.hdcp18)   ?? null),
      // New typed handicap overrides (auto-calculated values set by finalize-week)
      hcpFront9Override,
      hcpFront9OverrideValue: hcpFront9Override ? hcpFront9OverrideValue : null,
      hcpBack9Override,
      hcpBack9OverrideValue:  hcpBack9Override  ? hcpBack9OverrideValue  : null,
      hcp18Override,
      hcp18OverrideValue:     hcp18Override     ? hcp18OverrideValue     : null,
      updatedAt: new Date().toISOString(),
      createdAt: (existing && existing.createdAt) || new Date().toISOString()
    }

    await store.setJSON(key, updated)
    return Response.json({ success: true, player: updated })
  }

  if (req.method === 'DELETE') {
    const authErr = requireAdmin(req)
    if (authErr) return authErr
    const email = normalizeEmail(url.searchParams.get('email'))
    if (!email) {
      return new Response('Missing email', { status: 400 })
    }
    const key = `player-${email}`
    await store.delete(key).catch(() => null)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/players'
}
