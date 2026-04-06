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
  const store = getStore(leagueStoreName('handicap-config', leagueId))

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    if (!body) return new Response('Invalid request body', { status: 400 })
    await store.setJSON('formula', {
      bestN: body.bestN || 8,
      lastN: body.lastN || 20,
      multiplier: body.multiplier || 0.96,
      maxHcp: body.maxHcp || 36,
      minRounds: body.minRounds || 3,
      bonus: body.bonus || 'none',
      updatedAt: new Date().toISOString()
    })
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const formula = await store.get('formula', { type: 'json' }).catch(() => null)
    if (!formula) {
      return Response.json({
        bestN: 8, lastN: 20, multiplier: 0.96,
        maxHcp: 36, minRounds: 3, bonus: 'none'
      })
    }
    return Response.json(formula)
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/handicap-formula'
}
