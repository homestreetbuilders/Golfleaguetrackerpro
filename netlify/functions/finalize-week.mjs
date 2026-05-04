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

// ── USGA Differential: (Gross - Rating) × (113 / Slope) ──────────────
function usgaDiff(gross, rating, slope) {
  if (!Number.isFinite(gross) || !Number.isFinite(rating) || !Number.isFinite(slope) || slope <= 0) return null
  return Math.round(((gross - rating) * (113 / slope)) * 10) / 10
}

// ── USGA Handicap Index from a list of differentials (newest-first) ───
// Selection table:
//   ≥20 rounds → avg of best 8 from last 20
//   10-19      → avg of best 4 from last 10
//   6-9        → avg of best 2
//   3-5        → lowest 1
//   <3         → null (Pending)
function usgaHandicapIndex(diffs) {
  if (!Array.isArray(diffs) || diffs.length < 3) return null
  const n = diffs.length
  let count, take
  if (n >= 20) { count = 20; take = 8 }
  else if (n >= 10) { count = 10; take = 4 }
  else if (n >= 6) { count = n; take = 2 }
  else { count = n; take = 1 } // 3-5
  const recent = diffs.slice(0, count) // already newest-first from listScoresForPlayer
  const sorted = [...recent].sort((a, b) => a - b)
  const best = sorted.slice(0, take)
  const avg = best.reduce((a, b) => a + b, 0) / best.length
  return Math.round(avg * 0.96 * 10) / 10
}

// ── Get course rating/slope for a given side ──────────────────────────
function getRatingSlope(coursesMap, courseName, side) {
  const c = coursesMap ? coursesMap.get(String(courseName || '').trim().toLowerCase()) : null
  if (!c) return { rating: null, slope: null, par: null }
  if (side === '18') {
    return {
      rating: c.fullRating || null,
      slope:  c.fullSlope  || null,
      par:    c.fullPar    || null
    }
  }
  if (side === 'back') {
    return {
      rating: Number.isFinite(c.backRating) ? c.backRating : (Number.isFinite(c.fullRating) ? c.fullRating / 2 : null),
      slope:  Number.isFinite(c.backSlope)  ? c.backSlope  : (Number.isFinite(c.fullSlope)  ? c.fullSlope  : null),
      par:    Number.isFinite(c.backPar)    ? c.backPar    : null
    }
  }
  // front
  return {
    rating: Number.isFinite(c.frontRating) ? c.frontRating : (Number.isFinite(c.fullRating) ? c.fullRating / 2 : null),
    slope:  Number.isFinite(c.frontSlope)  ? c.frontSlope  : (Number.isFinite(c.fullSlope)  ? c.fullSlope  : null),
    par:    Number.isFinite(c.frontPar)    ? c.frontPar    : null
  }
}

// ── Compute one of the 3 typed handicaps from all player scores ───────
function computeTypedHcp(allScores, sideFilter, coursesMap) {
  const filtered = (allScores || []).filter(s => {
    const ss = String(s.side || '').toLowerCase()
    if (sideFilter === '18') return ss === '18' || ss === 'both' || ss === 'full'
    if (sideFilter === 'back') return ss === 'back'
    return ss === 'front' || (ss !== 'back' && ss !== '18' && ss !== 'both' && ss !== 'full')
  })
  const diffs = []
  for (const s of filtered) {
    const gross = asNum(s.grossTotal)
    if (!Number.isFinite(gross)) continue
    const { rating, slope, par: cpar } = getRatingSlope(coursesMap, s.course, sideFilter)
    if (Number.isFinite(rating) && Number.isFinite(slope) && slope > 0) {
      const d = usgaDiff(gross, rating, slope)
      if (d !== null) diffs.push(d)
    } else {
      // Fallback when course has no rating/slope: use gross - par
      const par = Number.isFinite(cpar) ? cpar : (asNum(s.parTotal) || 36)
      diffs.push(gross - par)
    }
  }
  return usgaHandicapIndex(diffs)
}

function getSiteBaseUrl(req) {
  const envUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL
  if (envUrl) return String(envUrl).replace(/\/$/, '')
  const host = req && req.headers ? (req.headers.get('x-forwarded-host') || req.headers.get('host')) : null
  const proto = req && req.headers ? (req.headers.get('x-forwarded-proto') || 'https') : 'https'
  return host ? `${proto}://${host}` : null
}

async function listScoresForPlayer(store, playerName, playerEmail) {
  const prefix = `week-`
  const { blobs } = await store.list({ prefix }).catch(() => ({ blobs: [] }))
  const out = []
  for (const b of blobs || []) {
    const data = await store.get(b.key, { type: 'json' }).catch(() => null)
    if (!data) continue
    if (data.status !== 'final') continue
    if (!data.player) continue
    // Fix #5: match by email when available, fall back to name
    const emailMatch = playerEmail && data.playerEmail && normalizeEmail(data.playerEmail) === normalizeEmail(playerEmail)
    const nameMatch = String(data.player).toLowerCase() === String(playerName).toLowerCase()
    if (!emailMatch && !nameMatch) continue
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

  // Fix #6: use actual course par stored in the score record instead of hardcoded 36
  const diffs = recent.map(r => {
    const gross = asNum(r && r.grossTotal)
    if (!Number.isFinite(gross)) return null
    const par = asNum(r && r.parTotal) || 36
    return gross - par
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
  const coursesBlobStore = getStore(leagueStoreName('courses', leagueId))

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.json().catch(() => null)
  const week = body && body.week
  const players = Array.isArray(body && body.players) ? body.players : null
  const submittedBy = body && body.submittedBy ? body.submittedBy : null
  // force=true bypasses lock check and recalculates handicaps for already-final scores
  const force = Boolean(body && body.force)

  if (!week) {
    return new Response('Missing week', { status: 400 })
  }

  const prefix = `week-${week}-`
  const { blobs } = await store.list({ prefix }).catch(() => ({ blobs: [] }))

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

  // Fix #11: build player lookup map ONCE before the loop instead of scanning
  // all player blobs for every player being finalized (was O(N²) blob reads)
  const { blobs: pBlobs } = await playerStore.list().catch(() => ({ blobs: [] }))
  const playerByName = new Map()   // name.toLowerCase() → { email, key, obj }
  const playerByEmail = new Map()  // email → { email, key, obj }
  for (const pb of pBlobs || []) {
    const po = await playerStore.get(pb.key, { type: 'json' }).catch(() => null)
    if (!po || !po.name || !po.email) continue
    const entry = { email: normalizeEmail(po.email), key: pb.key, obj: po }
    playerByName.set(String(po.name).toLowerCase(), entry)
    playerByEmail.set(normalizeEmail(po.email), entry)
  }

  const formula = await formulaStore.get('formula', { type: 'json' }).catch(() => null)

  // Build courses map for USGA differential computation
  const coursesMap = new Map() // courseName.toLowerCase() → course object
  try {
    const { blobs: cBlobs } = await coursesBlobStore.list().catch(() => ({ blobs: [] }))
    for (const cb of cBlobs || []) {
      const c = await coursesBlobStore.get(cb.key, { type: 'json' }).catch(() => null)
      if (c && c.name) coursesMap.set(String(c.name).trim().toLowerCase(), c)
    }
  } catch (_) { /* non-fatal */ }

  for (const p of targetPlayers) {
    const playerName = p
    const latest = latestByPlayer.get(playerName)
    if (!latest) {
      missing.push(playerName)
      continue
    }

    // Fix #7: check both name-based and email-based lock keys
    const nameLockKey = `lock-${String(playerName).toLowerCase()}-week-${week}`
    const playerEmailFromScore = latest.playerEmail ? normalizeEmail(latest.playerEmail) : null
    const emailLockKey = playerEmailFromScore ? `lock-email-${playerEmailFromScore}-week-${week}` : null

    const nameLock = await lockStore.get(nameLockKey, { type: 'json' }).catch(() => null)
    const emailLock = emailLockKey ? await lockStore.get(emailLockKey, { type: 'json' }).catch(() => null) : null
    if (!force && ((nameLock && nameLock.locked) || (emailLock && emailLock.locked))) {
      skippedLocked.push(playerName)
      continue
    }

    const alreadyFinal = latest.status === 'final'
    if (alreadyFinal) {
      // Lock it and record; if not force, skip handicap recalc
      const lockData = { locked: true, lockedAt: new Date().toISOString(), reason: 'finalize_week_existing_final' }
      await lockStore.setJSON(nameLockKey, lockData)
      if (emailLockKey) await lockStore.setJSON(emailLockKey, lockData).catch(() => null)
      finalized.push({ player: playerName, key: null, alreadyFinal: true })
      if (!force) continue
      // force=true: fall through to handicap recalc
    } else {
      const newKey = `week-${week}-${String(playerName).toLowerCase()}-${Date.now()}`
      await store.setJSON(newKey, {
        ...latest,
        status: 'final',
        finalizedFromKey: latest.key || null,
        finalizedBy: submittedBy,
        finalizedAt: new Date().toISOString()
      })

      const lockData = { locked: true, lockedAt: new Date().toISOString(), reason: 'finalize_week' }
      await lockStore.setJSON(nameLockKey, lockData)
      if (emailLockKey) await lockStore.setJSON(emailLockKey, lockData).catch(() => null)

      finalized.push({ player: playerName, key: newKey, alreadyFinal: false })
    }

    // Handicap update
    try {
      // Fix #5/#11: use playerEmail from the score record first, then fall back to name scan
      // (player map is already built above — no extra blob reads per player)
      let playerEntry = null
      if (playerEmailFromScore) {
        playerEntry = playerByEmail.get(playerEmailFromScore)
      }
      if (!playerEntry) {
        playerEntry = playerByName.get(String(playerName).toLowerCase())
      }
      if (!playerEntry) continue

      const { email, key: playerKey, obj: playerObj } = playerEntry

      const override = await overrideStore.get(`override-${email}`, { type: 'json' }).catch(() => null)

      // Fetch all final scores for this player (newest first)
      const allScores = await listScoresForPlayer(store, playerName, email)

      // ── Old single handicap (backward compat) ──
      let nextHcp = null
      let source = 'system'
      let note = null

      if (override && typeof override.value === 'number') {
        nextHcp = override.value
        source = 'override'
        note = override.note || null
      } else {
        nextHcp = computeHandicapFromScores(allScores, formula || null)
        source = 'system'
      }

      // ── New typed handicaps (USGA differential formula) ──
      const calcFront9 = computeTypedHcp(allScores, 'front', coursesMap)
      const calcBack9  = computeTypedHcp(allScores, 'back',  coursesMap)
      const calcHcp18  = computeTypedHcp(allScores, '18',    coursesMap)

      // Respect per-type overrides stored on the player record
      const hcpFront9 = (playerObj.hcpFront9Override && playerObj.hcpFront9OverrideValue !== null && playerObj.hcpFront9OverrideValue !== undefined)
        ? playerObj.hcpFront9OverrideValue
        : (calcFront9 !== null ? calcFront9 : (playerObj.hcpFront9 !== undefined ? playerObj.hcpFront9 : null))

      const hcpBack9 = (playerObj.hcpBack9Override && playerObj.hcpBack9OverrideValue !== null && playerObj.hcpBack9OverrideValue !== undefined)
        ? playerObj.hcpBack9OverrideValue
        : (calcBack9 !== null ? calcBack9 : (playerObj.hcpBack9 !== undefined ? playerObj.hcpBack9 : null))

      const hcp18 = (playerObj.hcp18Override && playerObj.hcp18OverrideValue !== null && playerObj.hcp18OverrideValue !== undefined)
        ? playerObj.hcp18OverrideValue
        : (calcHcp18 !== null ? calcHcp18 : (playerObj.hcp18 !== undefined ? playerObj.hcp18 : null))

      const updatedPlayer = {
        ...(playerObj || {}),
        hcpFront9,
        hcpBack9,
        hcp18,
        updatedAt: new Date().toISOString()
      }

      // Keep old handicap field if it was computed or overridden
      if (nextHcp !== null && Number.isFinite(nextHcp)) {
        updatedPlayer.handicap = nextHcp
      }

      await playerStore.setJSON(playerKey, updatedPlayer)

      if (nextHcp !== null && Number.isFinite(nextHcp)) {
        await histStore.setJSON(`hist-${email}-${Date.now()}`, {
          email,
          value: nextHcp,
          source,
          at: new Date().toISOString(),
          week,
          date: latest.date || null,
          note
        })
      }
    } catch (e) {
      // non-fatal
    }
  }

  // Side games ledger compute (non-fatal)
  try {
    const base = getSiteBaseUrl(req)
    if (base && leagueId) {
      await fetch(`${base}/api/side-games-ledger?leagueId=${encodeURIComponent(leagueId)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'compute', week })
      }).catch(() => null)
    }
  } catch (e) {
    // non-fatal
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
