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

  if (req.method === 'GET') {
    const mode = await store.get('scoring-mode', { type: 'text' }).catch(() => null)
    return Response.json({ mode: mode || 'batch' })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const mode = body && body.mode
    const normalized = String(mode || '').toLowerCase()
    if (!['live', 'batch'].includes(normalized)) {
      return new Response('Invalid mode', { status: 400 })
    }
    await store.set('scoring-mode', normalized)
    return Response.json({ success: true, mode: normalized })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/scoring-mode'
}
