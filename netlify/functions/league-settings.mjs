import { getStore } from '@netlify/blobs'

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
  const store = getStore(leagueStoreName('league-settings', leagueId))
  const key = 'settings'

  if (req.method === 'GET') {
    const settings = await store.get(key, { type: 'json' }).catch(() => null)
    return Response.json({
      settings: settings || {
        leagueName: 'Fairway Command League',
        seasonStart: null,
        seasonEnd: null,
        teePlacementsCount: 3,
        handicapMode: 'usga',
        customFormulaText: ''
      }
    })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const incoming = body && typeof body === 'object' ? body : {}
    const normalized = {
      leagueName: incoming.leagueName ? String(incoming.leagueName) : 'Fairway Command League',
      seasonStart: incoming.seasonStart ? String(incoming.seasonStart) : null,
      seasonEnd: incoming.seasonEnd ? String(incoming.seasonEnd) : null,
      teePlacementsCount: Number.isFinite(Number(incoming.teePlacementsCount)) ? Number(incoming.teePlacementsCount) : 3,
      handicapMode: incoming.handicapMode ? String(incoming.handicapMode).toLowerCase() : 'usga',
      customFormulaText: incoming.customFormulaText ? String(incoming.customFormulaText) : '',
      updatedAt: new Date().toISOString()
    }

    await store.setJSON(key, normalized)
    return Response.json({ success: true, settings: normalized })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/league-settings'
}
