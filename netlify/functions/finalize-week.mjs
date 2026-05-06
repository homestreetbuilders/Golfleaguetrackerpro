import { db, COL, lid, getDoc, setDoc, addDoc, listDocs } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function asNum(v) { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? n : null }
function clamp(n, min, max) { if (!Number.isFinite(n)) return n; return Math.min(max, Math.max(min, n)) }

function usgaDiff(gross, rating, slope) {
  if (!Number.isFinite(gross) || !Number.isFinite(rating) || !Number.isFinite(slope) || slope <= 0) return null
  return Math.round(((gross - rating) * (113 / slope)) * 10) / 10
}

function usgaHandicapIndex(diffs) {
  if (!Array.isArray(diffs) || diffs.length < 3) return null
  const n = diffs.length
  let count, take
  if (n >= 20) { count = 20; take = 8 }
  else if (n >= 10) { count = 10; take = 4 }
  else if (n >= 6) { count = n; take = 2 }
  else { count = n; take = 1 }
  const recent = diffs.slice(0, count)
  const sorted = [...recent].sort((a, b) => a - b)
  const best = sorted.slice(0, take)
  const avg = best.reduce((a, b) => a + b, 0) / best.length
  return Math.round(avg * 0.96 * 10) / 10
}

function getRatingSlope(coursesMap, courseName, side) {
  const c = coursesMap ? coursesMap.get(String(courseName || '').trim().toLowerCase()) : null
  if (!c) return { rating: null, slope: null, par: null }
  if (side === '18') return { rating: c.fullRating || null, slope: c.fullSlope || null, par: c.fullPar || null }
  if (side === 'back') return {
    rating: Number.isFinite(c.backRating) ? c.backRating : (Number.isFinite(c.fullRating) ? c.fullRating / 2 : null),
    slope:  Number.isFinite(c.backSlope)  ? c.backSlope  : (Number.isFinite(c.fullSlope)  ? c.fullSlope  : null),
    par:    Number.isFinite(c.backPar)    ? c.backPar    : null
  }
  return {
    rating: Number.isFinite(c.frontRating) ? c.frontRating : (Number.isFinite(c.fullRating) ? c.fullRating / 2 : null),
    slope:  Number.isFinite(c.frontSlope)  ? c.frontSlope  : (Number.isFinite(c.fullSlope)  ? c.fullSlope  : null),
    par:    Number.isFinite(c.frontPar)    ? c.frontPar    : null
  }
}

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
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const body = await req.json().catch(() => null)
  const week = body && body.week
  const players = Array.isArray(body && body.players) ? body.players : null
  const submittedBy = body && body.submittedBy ? body.submittedBy : null
  const force = Boolean(body && body.force)

  if (!week) return new Response('Missing week', { status: 400 })

  // Query all scores for this week
  const weekNum = asInt(week)
  const scoresSnap = await db.collection(COL.scores)
    .where('leagueId', '==', leagueId)
    .where('week', '==', weekNum || week)
    .get()

  // Build latest-per-player map (store docId for later update)
  const latestByPlayer = new Map()
  for (const doc of scoresSnap.docs) {
    const data = { ...doc.data(), _docId: doc.id }
    if (!data.player) continue
    const playerName = data.player
    if (players && !players.some(p => String(p).toLowerCase() === String(playerName).toLowerCase())) continue
    const cur = latestByPlayer.get(playerName)
    const ts = data.submittedAt ? Date.parse(data.submittedAt) : 0
    const curTs = cur && cur.submittedAt ? Date.parse(cur.submittedAt) : 0
    if (!cur || ts >= curTs) latestByPlayer.set(playerName, data)
  }

  const finalized = []
  const skippedLocked = []
  const missing = []

  const targetPlayers = players || Array.from(latestByPlayer.keys())

  // Build player lookup maps
  const playerDocs = await listDocs(COL.players, leagueId)
  const playerByName = new Map()
  const playerByEmail = new Map()
  for (const po of playerDocs) {
    if (!po || !po.name || !po.email) continue
    const entry = { email: normalizeEmail(po.email), obj: po }
    playerByName.set(String(po.name).toLowerCase(), entry)
    playerByEmail.set(normalizeEmail(po.email), entry)
  }

  // Load formula
  const formulaSnap = await db.collection(COL.handicapConfig).doc(leagueId).get()
  const formula = formulaSnap.exists ? formulaSnap.data() : null

  // Build courses map
  const coursesMap = new Map()
  try {
    const courseDocs = await listDocs(COL.courses, leagueId)
    for (const c of courseDocs) {
      if (c && c.name) coursesMap.set(String(c.name).trim().toLowerCase(), c)
    }
  } catch (_) { /* non-fatal */ }

  for (const p of targetPlayers) {
    const playerName = p
    const latest = latestByPlayer.get(playerName)
    if (!latest) { missing.push(playerName); continue }

    const playerEmailFromScore = latest.playerEmail ? normalizeEmail(latest.playerEmail) : null

    // Check locks
    const nameLockId  = `lock-${String(playerName).toLowerCase()}-week-${week}`
    const emailLockId = playerEmailFromScore ? `lock-email-${playerEmailFromScore}-week-${week}` : null

    const [nameLockSnap, emailLockSnap] = await Promise.all([
      db.collection(COL.scorecardLocks).doc(lid(leagueId, nameLockId)).get(),
      emailLockId ? db.collection(COL.scorecardLocks).doc(lid(leagueId, emailLockId)).get() : Promise.resolve(null)
    ])

    const nameLock  = nameLockSnap.exists  ? nameLockSnap.data()  : null
    const emailLock = emailLockSnap && emailLockSnap.exists ? emailLockSnap.data() : null

    if (!force && ((nameLock && nameLock.locked) || (emailLock && emailLock.locked))) {
      skippedLocked.push(playerName)
      continue
    }

    const alreadyFinal = latest.status === 'final'
    if (alreadyFinal) {
      const lockData = { locked: true, lockedAt: new Date().toISOString(), reason: 'finalize_week_existing_final' }
      const lockWrites = [db.collection(COL.scorecardLocks).doc(lid(leagueId, nameLockId)).set({ leagueId, ...lockData })]
      if (emailLockId) lockWrites.push(db.collection(COL.scorecardLocks).doc(lid(leagueId, emailLockId)).set({ leagueId, ...lockData }))
      await Promise.all(lockWrites)
      finalized.push({ player: playerName, key: null, alreadyFinal: true })
      if (!force) continue
    } else {
      // Update existing score doc to final
      await db.collection(COL.scores).doc(latest._docId).update({
        status: 'final',
        finalizedBy: submittedBy,
        finalizedAt: new Date().toISOString()
      })

      const lockData = { locked: true, lockedAt: new Date().toISOString(), reason: 'finalize_week' }
      const lockWrites = [db.collection(COL.scorecardLocks).doc(lid(leagueId, nameLockId)).set({ leagueId, ...lockData })]
      if (emailLockId) lockWrites.push(db.collection(COL.scorecardLocks).doc(lid(leagueId, emailLockId)).set({ leagueId, ...lockData }))
      await Promise.all(lockWrites)

      finalized.push({ player: playerName, key: latest._docId, alreadyFinal: false })
    }

    // Handicap update
    try {
      let playerEntry = null
      if (playerEmailFromScore) playerEntry = playerByEmail.get(playerEmailFromScore)
      if (!playerEntry) playerEntry = playerByName.get(String(playerName).toLowerCase())
      if (!playerEntry) continue

      const { email, obj: playerObj } = playerEntry

      const override = await getDoc(COL.handicapOverrides, leagueId, email)

      // Fetch all final scores for this player
      const allScoresSnap = await db.collection(COL.scores)
        .where('leagueId', '==', leagueId)
        .where('status', '==', 'final')
        .get()
      const allScores = allScoresSnap.docs.map(d => d.data()).filter(s => {
        const emailMatch = email && s.playerEmail && normalizeEmail(s.playerEmail) === email
        const nameMatch = String(s.player || '').toLowerCase() === String(playerName).toLowerCase()
        return emailMatch || nameMatch
      })
      allScores.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

      let nextHcp = null
      let source = 'system'
      let note = null

      if (override && typeof override.value === 'number') {
        nextHcp = override.value; source = 'override'; note = override.note || null
      } else {
        nextHcp = computeHandicapFromScores(allScores, formula || null)
      }

      const calcFront9 = computeTypedHcp(allScores, 'front', coursesMap)
      const calcBack9  = computeTypedHcp(allScores, 'back',  coursesMap)
      const calcHcp18  = computeTypedHcp(allScores, '18',    coursesMap)

      const hcpFront9 = (playerObj.hcpFront9Override && playerObj.hcpFront9OverrideValue !== null && playerObj.hcpFront9OverrideValue !== undefined)
        ? playerObj.hcpFront9OverrideValue : (calcFront9 !== null ? calcFront9 : (playerObj.hcpFront9 !== undefined ? playerObj.hcpFront9 : null))
      const hcpBack9 = (playerObj.hcpBack9Override && playerObj.hcpBack9OverrideValue !== null && playerObj.hcpBack9OverrideValue !== undefined)
        ? playerObj.hcpBack9OverrideValue : (calcBack9 !== null ? calcBack9 : (playerObj.hcpBack9 !== undefined ? playerObj.hcpBack9 : null))
      const hcp18 = (playerObj.hcp18Override && playerObj.hcp18OverrideValue !== null && playerObj.hcp18OverrideValue !== undefined)
        ? playerObj.hcp18OverrideValue : (calcHcp18 !== null ? calcHcp18 : (playerObj.hcp18 !== undefined ? playerObj.hcp18 : null))

      const updatedPlayer = { ...playerObj, hcpFront9, hcpBack9, hcp18, updatedAt: new Date().toISOString() }
      if (nextHcp !== null && Number.isFinite(nextHcp)) updatedPlayer.handicap = nextHcp

      await setDoc(COL.players, leagueId, email, updatedPlayer)

      if (nextHcp !== null && Number.isFinite(nextHcp)) {
        await addDoc(COL.handicapHistory, leagueId, {
          email, value: nextHcp, source, at: new Date().toISOString(),
          week, date: latest.date || null, note
        })
      }
    } catch (e) { /* non-fatal */ }
  }

  // Trigger side games ledger compute
  try {
    const base = getSiteBaseUrl(req)
    if (base && leagueId) {
      await fetch(`${base}/api/side-games-ledger?leagueId=${encodeURIComponent(leagueId)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'compute', week })
      }).catch(() => null)
    }
  } catch (e) { /* non-fatal */ }

  return Response.json({ success: true, week, finalized, skippedLocked, missing })
}

export const config = { path: '/api/finalize-week' }
