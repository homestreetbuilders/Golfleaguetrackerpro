import { getStore } from '@netlify/blobs'

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function leagueStoreName(base, leagueId) {
  const id = normalizeLeagueId(leagueId)
  return id ? `${base}-${id}` : base
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function normalizeGame(v) {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'net_skins' || s === 'gross_skins' || s === 'fifty_fifty') return s
  return null
}

function gameField(game) {
  if (game === 'net_skins') return 'netSkins'
  if (game === 'gross_skins') return 'grossSkins'
  if (game === 'fifty_fifty') return 'fiftyFifty'
  return null
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('side-game-optins', leagueId))

  if (req.method === 'GET') {
    const email = normalizeEmail(url.searchParams.get('email'))
    if (email) {
      const rec = await store.get(`optin-${email}`, { type: 'json' }).catch(() => null)
      return Response.json({ optIn: rec || null })
    }

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const optIns = []
    for (const b of blobs || []) {
      if (!b || !b.key || !String(b.key).startsWith('optin-')) continue
      const rec = await store.get(b.key, { type: 'json' }).catch(() => null)
      if (rec) optIns.push(rec)
    }
    optIns.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
    return Response.json({ optIns })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const email = normalizeEmail(body && body.email)
    const game = normalizeGame(body && body.game)
    const enabled = !!(body && body.enabled)
    const joinedWeek = asInt(body && body.joinedWeek)

    if (!email || !game) {
      return new Response('Missing email or game', { status: 400 })
    }

    const field = gameField(game)
    if (!field) {
      return new Response('Invalid game', { status: 400 })
    }

    const existing = await store.get(`optin-${email}`, { type: 'json' }).catch(() => null)
    const next = {
      ...(existing || {}),
      email,
      [field]: {
        enabled,
        joinedWeek: enabled ? (joinedWeek || (existing && existing[field] && existing[field].joinedWeek) || 1) : null
      },
      updatedAt: new Date().toISOString()
    }

    await store.setJSON(`optin-${email}`, next)
    return Response.json({ success: true, optIn: next })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/side-game-optins'
}
