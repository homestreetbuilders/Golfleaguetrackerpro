import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('scores')
  const lockStore = getStore('scorecard-locks')

  if (req.method === 'POST') {
    const body = await req.json()

    const player = body.player
    const playerEmail = body.playerEmail || null
    const week = body.week
    const date = body.date

    if (!player || !week || !date) {
      return new Response('Missing player, week, or date', { status: 400 })
    }

    const lockKey = `lock-${String(player).toLowerCase()}-week-${week}`
    const lock = await lockStore.get(lockKey, { type: 'json' })
    if (lock && lock.locked) {
      return new Response('Scorecard locked', { status: 423 })
    }

    const status = body.status === 'final' ? 'final' : 'draft'
    const holes = Array.isArray(body.holes) ? body.holes : null
    const grossTotal = typeof body.grossTotal === 'number' ? body.grossTotal : null
    const tee = body.tee || null
    const course = body.course || null

    const side = body.side === 'back' ? 'back' : 'front'
    const handicapSnapshot = typeof body.handicapSnapshot === 'number' ? body.handicapSnapshot : null
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
      grossTotal,
      handicapSnapshot,
      stats: stats ? { perHole: perHole || null, round: round || null } : null,
      status,
      submittedBy: body.submittedBy || null,
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
    const url = new URL(req.url)
    const player = url.searchParams.get('player')
    const week = url.searchParams.get('week')
    const includeDraft = url.searchParams.get('includeDraft') === '1'
    const prefix = week ? `week-${week}-` : undefined
    const { blobs } = await store.list({ prefix })
    const scores = []
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' })
      if (!data) continue
      if (player && String(data.player).toLowerCase() !== String(player).toLowerCase()) continue
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
