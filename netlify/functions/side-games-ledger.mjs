import { db, COL, lid, listDocs, getDoc, setDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function asNum(v) { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? n : null }
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100 }

function getStrokesForNine(hi) {
  const h = typeof hi === 'number' ? hi : parseFloat(hi)
  if (!Number.isFinite(h) || h <= 0) return 0
  return Math.max(0, Math.round(h / 2))
}

function allocateStrokeDots(strokes, hcpIdxArr) {
  const base = Array.isArray(hcpIdxArr) && hcpIdxArr.length === 9 ? hcpIdxArr : [5,9,1,7,3,8,2,6,4]
  const order = Array.from({ length: 9 }).map((_, i) => ({ hole: i + 1, idx: Number(base[i]) || 1 })).sort((a, b) => a.idx - b.idx)
  const dots = new Array(9).fill(0)
  for (let s = 0; s < strokes; s++) { const pick = order[s % 9].hole; dots[pick - 1] += 1 }
  return dots
}

function findPlayerEmailByName(players, playerName) {
  const n = String(playerName || '').trim().toLowerCase()
  const p = (players || []).find(x => String(x && x.name || '').trim().toLowerCase() === n)
  return p && p.email ? String(p.email).trim().toLowerCase() : null
}

function findCourseByName(courses, courseName) {
  const n = String(courseName || '').trim().toLowerCase()
  if (!n) return null
  const exact = (courses || []).find(c => String(c && c.name || '').trim().toLowerCase() === n)
  if (exact) return exact
  return (courses || []).find(c => { const cn = String(c && c.name || '').trim().toLowerCase(); return cn && (cn.includes(n) || n.includes(cn)) }) || null
}

function getNineHcpIdx(course, side) {
  const holes = course && Array.isArray(course.holes) ? course.holes : []
  const slice = side === 'back' ? holes.slice(9, 18) : holes.slice(0, 9)
  const idx = slice.map(h => Number(h && h.hcpIndex) || 1)
  return idx.length === 9 ? idx : null
}

function splitSkinsByHole(scoresByPlayer) {
  const winners = []
  for (let i = 0; i < 9; i++) {
    const vals = []
    for (const row of scoresByPlayer) {
      const gross = row && row.holeScores ? row.holeScores[i] : null
      if (!Number.isFinite(gross)) continue
      const dots = row && Array.isArray(row.dots) ? (Number(row.dots[i]) || 0) : 0
      vals.push({ playerName: row.playerName, net: gross - dots })
    }
    if (!vals.length) continue
    vals.sort((a, b) => a.net - b.net)
    if (vals.length >= 2 && vals[0].net === vals[1].net) continue
    winners.push({ hole: i + 1, playerName: vals[0].playerName, net: vals[0].net })
  }
  return winners
}

function splitGrossSkinsByHole(scoresByPlayer) {
  const winners = []
  for (let i = 0; i < 9; i++) {
    const vals = []
    for (const row of scoresByPlayer) {
      const gross = row && row.holeScores ? row.holeScores[i] : null
      if (!Number.isFinite(gross)) continue
      vals.push({ playerName: row.playerName, gross })
    }
    if (!vals.length) continue
    vals.sort((a, b) => a.gross - b.gross)
    if (vals.length >= 2 && vals[0].gross === vals[1].gross) continue
    winners.push({ hole: i + 1, playerName: vals[0].playerName, gross: vals[0].gross })
  }
  return winners
}

function summarizeSkinsPayouts(skins, totalPot) {
  const totalSkins = skins.length
  if (!totalSkins) return { skinValue: 0, payouts: {}, totalSkins: 0, carryover: round2(totalPot) }
  const skinValue = totalPot / totalSkins
  const payouts = {}
  for (const s of skins) { payouts[s.playerName] = round2((payouts[s.playerName] || 0) + skinValue) }
  return { skinValue: round2(skinValue), payouts, totalSkins, carryover: 0 }
}

function computeLowNetWinners(rows) {
  const vals = rows.map(r => ({ playerName: r.playerName, netTotal: (Number(r.grossTotal) || 0) - (Number(r.strokes) || 0) })).filter(v => Number.isFinite(v.netTotal))
  if (!vals.length) return { winners: [], lowNet: null }
  vals.sort((a, b) => a.netTotal - b.netTotal)
  const low = vals[0].netTotal
  return { winners: vals.filter(v => v.netTotal === low).map(v => v.playerName), lowNet: low }
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  const weekParam = asInt(url.searchParams.get('week'))

  if (req.method === 'GET') {
    if (weekParam) {
      const rec = await getDoc(COL.sideGamesLedger, leagueId, `week-${weekParam}`)
      return Response.json({ week: weekParam, ledger: rec || null })
    }
    const docs = await listDocs(COL.sideGamesLedger, leagueId)
    const weeks = docs.filter(d => d.week).sort((a, b) => (a.week || 0) - (b.week || 0))
    return Response.json({ ledgers: weeks })
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const body = await req.json().catch(() => null)
  const week = asInt(body && body.week)
  const action = String((body && body.action) || 'compute').trim().toLowerCase()
  if (!week) return new Response('Missing week', { status: 400 })
  if (action !== 'compute') return new Response('Invalid action', { status: 400 })

  // Load data in parallel
  const [scheduleDocs, leagueSettingsSnap, carryoverDoc, players, optIns, courses, allSubs] = await Promise.all([
    listDocs(COL.schedule, leagueId),
    db.collection(COL.leagueSettings).doc(leagueId).get(),
    getDoc(COL.sideGamesLedger, leagueId, 'carryover'),
    listDocs(COL.players, leagueId),
    listDocs(COL.sideGameOptins, leagueId),
    listDocs(COL.courses, leagueId),
    listDocs(COL.substitutes, leagueId)
  ])

  const scheduleWeek = scheduleDocs.find(d => d.week === week) || null
  const scheduleSide = scheduleWeek && scheduleWeek.side ? String(scheduleWeek.side) : 'front'
  const scheduleType = scheduleWeek && scheduleWeek.type ? String(scheduleWeek.type) : 'match'

  const matchWeeksCount = Math.max(1, scheduleDocs.filter(w => String(w && w.type || 'match') === 'match').length)

  const leagueSettings = leagueSettingsSnap.exists ? leagueSettingsSnap.data() : null
  const netSkinsSeasonPot = asNum(leagueSettings && leagueSettings.netSkinsSeasonPot) || 0
  const grossSkinsSeasonPot = asNum(leagueSettings && leagueSettings.grossSkinsSeasonPot) || 0
  const fiftyBuyIn = asNum(leagueSettings && leagueSettings.fiftyFiftySeasonBuyIn) || 0

  const carryover = (carryoverDoc && typeof carryoverDoc === 'object') ? { ...carryoverDoc } : {}
  // Remove Firestore metadata fields from carryover before using it
  delete carryover.leagueId

  // Load final scores for this week
  const scoresSnap = await db.collection(COL.scores)
    .where('leagueId', '==', leagueId)
    .where('week', '==', week)
    .where('status', '==', 'final')
    .get()

  // Deduplicate: keep latest per player name
  const byPlayerName = new Map()
  for (const doc of scoresSnap.docs) {
    const s = { ...doc.data(), key: doc.id }
    const name = s && s.player ? String(s.player) : ''
    if (!name) continue
    const cur = byPlayerName.get(name)
    const ts = s.submittedAt ? Date.parse(s.submittedAt) : 0
    const curTs = cur && cur.submittedAt ? Date.parse(cur.submittedAt) : 0
    if (!cur || ts >= curTs) byPlayerName.set(name, s)
  }
  const scores = Array.from(byPlayerName.values())

  // Build weekly sub side-game flags: substituteEmail → subSideGames for this week
  const subWeeklyOptIns = new Map()
  for (const sub of (allSubs || [])) {
    if (asInt(sub && sub.week) !== week) continue
    const subEmail = sub.substituteEmail ? String(sub.substituteEmail).trim().toLowerCase() : null
    if (!subEmail) continue
    const sg = sub.subSideGames && typeof sub.subSideGames === 'object' ? sub.subSideGames : {}
    subWeeklyOptIns.set(subEmail, { netSkins: Boolean(sg.netSkins), grossSkins: Boolean(sg.grossSkins), fiftyFifty: Boolean(sg.fiftyFifty) })
  }

  const isEligible = (email, field) => {
    const e = String(email || '').trim().toLowerCase()
    // Substitute players: eligibility comes from their weekly sub assignment flags, not season opt-ins
    if (subWeeklyOptIns.has(e)) {
      return Boolean(subWeeklyOptIns.get(e)[field])
    }
    // Regular players: check season opt-in record
    const rec = (optIns || []).find(o => String(o && o.email || '').trim().toLowerCase() === e) || null
    const g = rec && rec[field] ? rec[field] : null
    if (!g || !g.enabled) return false
    return (asInt(g.joinedWeek) || 1) <= week
  }

  const sidesToCompute = scheduleSide === 'both' ? ['front', 'back'] : [scheduleSide === 'back' ? 'back' : 'front']

  const skinsResults = {}
  for (const side of sidesToCompute) {
    const skinsCarryKeyNet = `net_skins_${side}`
    const skinsCarryKeyGross = `gross_skins_${side}`
    const netWeeklyAlloc = netSkinsSeasonPot / matchWeeksCount
    const grossWeeklyAlloc = grossSkinsSeasonPot / matchWeeksCount
    const netCarry = asNum(carryover[skinsCarryKeyNet]) || 0
    const grossCarry = asNum(carryover[skinsCarryKeyGross]) || 0
    const netPot = netWeeklyAlloc + netCarry
    const grossPot = grossWeeklyAlloc + grossCarry

    const scoreRows = []
    for (const s of scores) {
      if (!s || !s.player) continue
      if (String(s.side || 'front') !== (side === 'back' ? 'back' : 'front')) continue
      const email = (s.playerEmail ? String(s.playerEmail).trim().toLowerCase() : null) || findPlayerEmailByName(players, s.player)
      if (!email) continue
      const course = findCourseByName(courses, s.course)
      if (!course) continue
      const hcpIdx = getNineHcpIdx(course, side)
      if (!hcpIdx) continue
      const holes = Array.isArray(s.holes) && s.holes.length === 9 ? s.holes.map(v => (v === null || v === undefined || v === '' ? null : Number(v))) : null
      if (!holes) continue
      const hi = asNum(s.handicapSnapshot)
      const strokes = getStrokesForNine(hi)
      const dots = allocateStrokeDots(strokes, hcpIdx)
      scoreRows.push({
        playerName: s.player, email, holeScores: holes,
        grossTotal: asNum(s.grossTotal), strokes, dots,
        eligibleNet: isEligible(email, 'netSkins'),
        eligibleGross: isEligible(email, 'grossSkins')
      })
    }

    const eligibleNetRows = scoreRows.filter(r => r.eligibleNet)
    const eligibleGrossRows = scoreRows.filter(r => r.eligibleGross)
    const netSkins = splitSkinsByHole(eligibleNetRows)
    const grossSkins = splitGrossSkinsByHole(eligibleGrossRows)
    const netSummary = summarizeSkinsPayouts(netSkins, netPot)
    const grossSummary = summarizeSkinsPayouts(grossSkins, grossPot)

    skinsResults[side] = {
      side,
      net: { pot: round2(netPot), weeklyAllocation: round2(netWeeklyAlloc), carryIn: round2(netCarry), skins: netSkins, skinValue: netSummary.skinValue, payouts: netSummary.payouts, carryOut: round2(netSummary.carryover), eligiblePlayers: eligibleNetRows.map(r => r.playerName) },
      gross: { pot: round2(grossPot), weeklyAllocation: round2(grossWeeklyAlloc), carryIn: round2(grossCarry), skins: grossSkins, skinValue: grossSummary.skinValue, payouts: grossSummary.payouts, carryOut: round2(grossSummary.carryover), eligiblePlayers: eligibleGrossRows.map(r => r.playerName) }
    }
    carryover[skinsCarryKeyNet] = round2(netSummary.carryover)
    carryover[skinsCarryKeyGross] = round2(grossSummary.carryover)
  }

  // 50/50
  const fiftyCarryKey = 'fifty_fifty'
  const fiftyCarryIn = asNum(carryover[fiftyCarryKey]) || 0
  const eligibleFifty = []
  for (const p of players) {
    const email = p && p.email ? String(p.email).trim().toLowerCase() : null
    const name = p && p.name ? String(p.name) : null
    if (!email || !name) continue
    if (!isEligible(email, 'fiftyFifty')) continue
    eligibleFifty.push({ email, name })
  }

  const fiftySeasonPot = fiftyBuyIn * eligibleFifty.length
  const fiftyWeeklyAlloc = fiftySeasonPot / matchWeeksCount
  const fiftyWeeklyPayoutBase = fiftyWeeklyAlloc * 0.5
  const fiftyLeagueCut = fiftyWeeklyAlloc * 0.5
  const fiftyPot = fiftyWeeklyPayoutBase + fiftyCarryIn

  const fiftyScoreRows = []
  if (scheduleSide === 'both') {
    const byPlayerSide = new Map()
    for (const s of scores) {
      if (!s || !s.player) continue
      const side = String(s.side || 'front')
      if (side !== 'front' && side !== 'back') continue
      const email = (s.playerEmail ? String(s.playerEmail).trim().toLowerCase() : null) || findPlayerEmailByName(players, s.player)
      if (!email || !isEligible(email, 'fiftyFifty')) continue
      const grossTotal = asNum(s.grossTotal)
      if (!Number.isFinite(grossTotal)) continue
      byPlayerSide.set(`${String(s.player).toLowerCase()}|${side}`, { playerName: s.player, side, grossTotal, strokes: getStrokesForNine(asNum(s.handicapSnapshot)) })
    }
    const playerNames = new Set([...byPlayerSide.keys()].map(k => k.split('|')[0]))
    for (const pn of playerNames) {
      const front = byPlayerSide.get(`${pn}|front`)
      const back = byPlayerSide.get(`${pn}|back`)
      if (!front || !back) continue
      fiftyScoreRows.push({ playerName: front.playerName, grossTotal: round2(front.grossTotal + back.grossTotal), strokes: round2(front.strokes + back.strokes) })
    }
  } else {
    const wantSide = scheduleSide === 'back' ? 'back' : 'front'
    for (const s of scores) {
      if (!s || !s.player || String(s.side || 'front') !== wantSide) continue
      const email = (s.playerEmail ? String(s.playerEmail).trim().toLowerCase() : null) || findPlayerEmailByName(players, s.player)
      if (!email || !isEligible(email, 'fiftyFifty')) continue
      const grossTotal = asNum(s.grossTotal)
      if (!Number.isFinite(grossTotal)) continue
      fiftyScoreRows.push({ playerName: s.player, grossTotal, strokes: getStrokesForNine(asNum(s.handicapSnapshot)) })
    }
  }

  const lowNet = computeLowNetWinners(fiftyScoreRows)
  const fiftyWinners = lowNet.winners
  let fiftyCarryOut = 0, fiftyPayouts = {}
  if (!fiftyWinners.length) {
    fiftyCarryOut = round2(fiftyPot)
  } else {
    const split = fiftyPot / fiftyWinners.length
    for (const w of fiftyWinners) fiftyPayouts[w] = round2(split)
  }
  carryover[fiftyCarryKey] = round2(fiftyCarryOut)

  const record = {
    week, computedAt: new Date().toISOString(),
    schedule: { week, type: scheduleType, side: scheduleSide, date: scheduleWeek && scheduleWeek.date ? scheduleWeek.date : null, title: scheduleWeek && scheduleWeek.title ? scheduleWeek.title : null, course: scheduleWeek && scheduleWeek.course ? scheduleWeek.course : null },
    config: { matchWeeksCount, netSkinsSeasonPot: round2(netSkinsSeasonPot), grossSkinsSeasonPot: round2(grossSkinsSeasonPot), fiftyFiftySeasonBuyIn: round2(fiftyBuyIn) },
    skins: skinsResults,
    fiftyFifty: { pot: round2(fiftyPot), weeklyAllocation: round2(fiftyWeeklyAlloc), weeklyPayoutBase: round2(fiftyWeeklyPayoutBase), weeklyLeagueCut: round2(fiftyLeagueCut), carryIn: round2(fiftyCarryIn), lowNet, payouts: fiftyPayouts, carryOut: round2(fiftyCarryOut), eligiblePlayers: eligibleFifty.map(p => p.name) }
  }

  await Promise.all([
    setDoc(COL.sideGamesLedger, leagueId, 'carryover', carryover),
    setDoc(COL.sideGamesLedger, leagueId, `week-${week}`, record)
  ])

  return Response.json({ success: true, ledger: record, carryover })
}

export const config = { path: '/api/side-games-ledger' }
