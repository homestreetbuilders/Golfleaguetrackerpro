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

  // Fix #14: guard missing leagueId so we never read/write the unscoped global store
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  const store = getStore(leagueStoreName('scores', leagueId))
  const lockStore = getStore(leagueStoreName('scorecard-locks', leagueId))

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)

    const player = body && body.player
    const playerEmail = (body && body.playerEmail) ? String(body.playerEmail).trim().toLowerCase() : null
    const week = body && body.week
    const date = body && body.date

    if (!player || !week || !date) {
      return new Response('Missing player, week, or date', { status: 400 })
    }

    // Fix #7: check both name-based and email-based lock keys
    const nameLockKey = `lock-${String(player).toLowerCase()}-week-${week}`
    const emailLockKey = playerEmail ? `lock-email-${playerEmail}-week-${week}` : null

    const nameLock = await lockStore.get(nameLockKey, { type: 'json' }).catch(() => null)
    const emailLock = emailLockKey ? await lockStore.get(emailLockKey, { type: 'json' }).catch(() => null) : null
    if ((nameLock && nameLock.locked) || (emailLock && emailLock.locked)) {
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
    // Fix #6: store parTotal so finalize-week can use actual course par in handicap diff
    const parTotal = body && typeof body.parTotal === 'number' && Number.isFinite(body.parTotal)
      ? body.parTotal
      : null
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
      parTotal,
      stats: stats ? { perHole: perHole || null, round: round || null } : null,
      status,
      submittedBy: (body && body.submittedBy) || null,
      submittedAt: new Date().toISOString()
    })

    if (status === 'final') {
      // Fix #7: write both lock key formats so finalize-week and scorecard-lock both work
      const lockData = { locked: true, lockedAt: new Date().toISOString(), reason: 'submitted' }
      await lockStore.setJSON(nameLockKey, lockData)
      if (emailLockKey) await lockStore.setJSON(emailLockKey, lockData).catch(() => null)
    }

    return Response.json({ success: true, key, locked: status === 'final' })
  }

  if (req.method === 'GET') {
    const player = url.searchParams.get('player')
    // Fix #5: support filtering by playerEmail so analytics and finalize-week
    // work correctly even when a player's display name changes
    const playerEmail = url.searchParams.get('playerEmail')
      ? String(url.searchParams.get('playerEmail')).trim().toLowerCase()
      : null
    const week = url.searchParams.get('week')
    const includeDraft = url.searchParams.get('includeDraft') === '1'
    const prefix = week ? `week-${week}-` : undefined
    const { blobs } = await store.list({ prefix }).catch(() => ({ blobs: [] }))
    const scores = []
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
      if (!data) continue
      // Fix #5: match by name OR email — whichever is provided, either match satisfies the filter
      if (player || playerEmail) {
        const nameMatch = player && String(data.player || '').toLowerCase() === String(player).toLowerCase()
        const emailMatch = playerEmail && String(data.playerEmail || '').toLowerCase() === playerEmail
        if (!nameMatch && !emailMatch) continue
      }
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
