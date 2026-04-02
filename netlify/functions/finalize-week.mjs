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

function asNum(v) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return n
  return Math.min(max, Math.max(min, n))
}

async function listScoresForPlayer(store, playerName) {
  const prefix = `week-`
  const { blobs } = await store.list({ prefix }).catch(() => ({ blobs: [] }))
  const out = []
  for (const b of blobs || []) {
    const data = await store.get(b.key, { type: 'json' }).catch(() => null)
    if (!data) continue
    if (data.status !== 'final') continue
    if (!data.player) continue
    if (String(data.player).toLowerCase() !== String(playerName).toLowerCase()) continue
    out.push(data)
  }
  out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  return out
}

function computeHandicapFromScores(scores, formula) {
  const lastN = asInt(formula && formula.lastN) || 20
  const bestN = asInt(formula && formula.bestN) || 8
  const multiplier = asNum(formula && formula.multiplier)
  const mult = Number.isFinite(multiplier) ? multiplier : 0.96
  const maxHcp = asNum(formula && formula.maxHcp)
  const maxVal = Number.isFinite(maxHcp) ? maxHcp : 36
  const minRounds = asInt(formula && formula.minRounds) || 3

  const recent = (scores || []).slice(0, Math.max(1, lastN))
  if (recent.length < minRounds) return null

  // Default: (gross - par36) for 9-hole rounds
  const diffs = recent.map(r => {
    const gross = asNum(r && r.grossTotal)
    if (!Number.isFinite(gross)) return null
    return gross - 36
  }).filter(v => v !== null)

  if (diffs.length < minRounds) return null

  diffs.sort((a, b) => a - b)
  const take = diffs.slice(0, Math.max(1, Math.min(bestN, diffs.length)))
  const avg = take.reduce((a, b) => a + b, 0) / take.length
  const raw = avg * mult
  const capped = clamp(raw, 0, maxVal)
  return Math.round(capped * 10) / 10
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('scores', leagueId))
  const lockStore = getStore(leagueStoreName('scorecard-locks', leagueId))
  const playerStore = getStore(leagueStoreName('players', leagueId))
  const formulaStore = getStore(leagueStoreName('handicap-config', leagueId))
  const overrideStore = getStore(leagueStoreName('handicap-overrides', leagueId))
  const histStore = getStore(leagueStoreName('handicap-history', leagueId))

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

    // Handicap update
    try {
      // Map playerName -> email by scanning players store (small leagues)
      const { blobs: pBlobs } = await playerStore.list().catch(() => ({ blobs: [] }))
      let email = null
      let playerKey = null
      let playerObj = null
      for (const pb of pBlobs || []) {
        const po = await playerStore.get(pb.key, { type: 'json' }).catch(() => null)
        if (!po || !po.name || !po.email) continue
        if (String(po.name).toLowerCase() === String(playerName).toLowerCase()) {
          email = normalizeEmail(po.email)
          playerKey = pb.key
          playerObj = po
          break
        }
      }

      if (!email || !playerKey) continue

      const override = await overrideStore.get(`override-${email}`, { type: 'json' }).catch(() => null)
      const formula = await formulaStore.get('formula', { type: 'json' }).catch(() => null)

      let nextHcp = null
      let source = 'system'
      let note = null

      if (override && typeof override.value === 'number') {
        nextHcp = override.value
        source = 'override'
        note = override.note || null
      } else {
        const allScores = await listScoresForPlayer(store, playerName)
        nextHcp = computeHandicapFromScores(allScores, formula || null)
        source = 'system'
      }

      if (nextHcp === null || !Number.isFinite(nextHcp)) continue

      const updatedPlayer = {
        ...(playerObj || {}),
        handicap: nextHcp,
        updatedAt: new Date().toISOString()
      }

      await playerStore.setJSON(playerKey, updatedPlayer)
      await histStore.setJSON(`hist-${email}-${Date.now()}`, {
        email,
        value: nextHcp,
        source,
        at: new Date().toISOString(),
        week,
        date: latest.date || null,
        note
      })
    } catch (e) {
      // non-fatal
    }
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
