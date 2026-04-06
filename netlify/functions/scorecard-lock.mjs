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
  const store = getStore(leagueStoreName('scorecard-locks', leagueId))

  if (req.method === 'GET') {
    const player = url.searchParams.get('player')
    const week = url.searchParams.get('week')
    if (!player || !week) {
      return new Response('Missing player or week', { status: 400 })
    }
    const key = `lock-${String(player).toLowerCase()}-week-${week}`
    const lock = await store.get(key, { type: 'json' }).catch(() => null)
    return Response.json(lock || { locked: false })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const player = body && body.player
    const week = body && body.week
    const locked = Boolean(body && body.locked)
    if (!player || !week) {
      return new Response('Missing player or week', { status: 400 })
    }

    const key = `lock-${String(player).toLowerCase()}-week-${week}`
    await store.setJSON(key, {
      locked,
      updatedAt: new Date().toISOString(),
      reason: body && body.reason ? body.reason : null
    })

    return Response.json({ success: true, locked })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/scorecard-lock'
}
