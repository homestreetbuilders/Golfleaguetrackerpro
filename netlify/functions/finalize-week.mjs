import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('scores')
  const lockStore = getStore('scorecard-locks')

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.json().catch(() => null)
  const week = body && body.week
  const players = Array.isArray(body && body.players) ? body.players : null
  const submittedBy = body && body.submittedBy ? body.submittedBy : null

  if (!week) {
    return new Response('Missing week', { status: 400 })
  }

  const prefix = `week-${week}-`
  const { blobs } = await store.list({ prefix })

  const latestByPlayer = new Map()
  for (const blob of blobs) {
    const data = await store.get(blob.key, { type: 'json' })
    if (!data || !data.player) continue
    const playerName = data.player
    if (players && !players.some(p => String(p).toLowerCase() === String(playerName).toLowerCase())) continue

    const cur = latestByPlayer.get(playerName)
    const ts = data.submittedAt ? Date.parse(data.submittedAt) : 0
    const curTs = cur && cur.submittedAt ? Date.parse(cur.submittedAt) : 0
    if (!cur || ts >= curTs) {
      latestByPlayer.set(playerName, data)
    }
  }

  const finalized = []
  const skippedLocked = []
  const missing = []

  const targetPlayers = players || Array.from(latestByPlayer.keys())

  for (const p of targetPlayers) {
    const playerName = p
    const latest = latestByPlayer.get(playerName)
    if (!latest) {
      missing.push(playerName)
      continue
    }

    const lockKey = `lock-${String(playerName).toLowerCase()}-week-${week}`
    const lock = await lockStore.get(lockKey, { type: 'json' })
    if (lock && lock.locked) {
      skippedLocked.push(playerName)
      continue
    }

    if (latest.status === 'final') {
      await lockStore.setJSON(lockKey, {
        locked: true,
        lockedAt: new Date().toISOString(),
        reason: 'finalize_week_existing_final'
      })
      finalized.push({ player: playerName, key: null, alreadyFinal: true })
      continue
    }

    const key = `week-${week}-${String(playerName).toLowerCase()}-${Date.now()}`
    await store.setJSON(key, {
      ...latest,
      status: 'final',
      finalizedFromKey: latest.key || null,
      finalizedBy: submittedBy,
      finalizedAt: new Date().toISOString()
    })

    await lockStore.setJSON(lockKey, {
      locked: true,
      lockedAt: new Date().toISOString(),
      reason: 'finalize_week'
    })

    finalized.push({ player: playerName, key, alreadyFinal: false })
  }

  return Response.json({
    success: true,
    week,
    finalized,
    skippedLocked,
    missing
  })
}

export const config = {
  path: '/api/finalize-week'
}
