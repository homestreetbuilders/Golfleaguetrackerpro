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
  const store = getStore(leagueStoreName('scores', leagueId))
  const lockStore = getStore(leagueStoreName('scorecard-locks', leagueId))

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)

    const player = body && body.player
    const playerEmail = (body && body.playerEmail) || null
    const week = body && body.week
    const date = body && body.date

    if (!player || !week || !date) {
      return new Response('Missing player, week, or date', { status: 400 })
    }

    const lockKey = `lock-${String(player).toLowerCase()}-week-${week}`
    const lock = await lockStore.get(lockKey, { type: 'json' }).catch(() => null)
    if (lock && lock.locked) {
      return new Response('Scorecard locked', { status: 423 })
    }

    const status = (body && body.status) === 'final' ? 'final' : 'draft'
    const holes = Array.isArray(body && body.holes) ? body.holes : null
    const shots = Array.isArray(body && body.shots) ? body.shots : null
    const grossTotal = body && typeof body.grossTotal === 'number' ? body.grossTotal : null
    const tee = (body && body.tee) || null
    const course = (body && body.course) || null

    const side = (body && body.side) === 'back' ? 'back' : 'front'
    const handicapSnapshot = body && typeof body.handicapSnapshot === 'number' ? body.handicapSnapshot : null
    const stats = body && typeof body.stats === 'object' && body.stats ? body.stats : null

    const perHole = stats && Array.isArray(stats.perHole) ? stats.perHole : null
    const round = stats && typeof stats.round === 'object' && stats.round ? stats.round : null

    const key = `week-${week}-${String(player).toLowerCase()}-${Date.now()}`
    await store.setJSON(key, {
      player,
      playerEmail,
      week,
      date,
      course,
      tee,
      side,
      holes,
      shots,
      grossTotal,
      handicapSnapshot,
      stats: stats ? { perHole: perHole || null, round: round || null } : null,
      status,
      submittedBy: (body && body.submittedBy) || null,
      submittedAt: new Date().toISOString()
    })

    if (status === 'final') {
      await lockStore.setJSON(lockKey, {
        locked: true,
        lockedAt: new Date().toISOString(),
        reason: 'submitted'
      })
    }

    return Response.json({ success: true, key, locked: status === 'final' })
  }

  if (req.method === 'GET') {
    const player = url.searchParams.get('player')
    const week = url.searchParams.get('week')
    const includeDraft = url.searchParams.get('includeDraft') === '1'
    const prefix = week ? `week-${week}-` : undefined
    const { blobs } = await store.list({ prefix }).catch(() => ({ blobs: [] }))
    const scores = []
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
      if (!data) continue
      if (player && String(data.player || '').toLowerCase() !== String(player).toLowerCase()) continue
      if (!includeDraft && data.status !== 'final') continue
      scores.push(data)
    }
    return Response.json({ scores })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/scores'
}
