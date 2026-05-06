/**
 * load-sample-data.mjs
 * POST /api/load-sample-data
 *
 * Seeds a complete Mud Run Golf League (or any league passed in the body).
 * Optional env var: SEED_SAMPLE_KEY — caller must send as x-seed-key header.
 */

import { db, COL, lid, setDoc, addDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function ne(email) { return String(email || '').trim().toLowerCase() }
function isoDate(offsetDays = 0) { const d = new Date(); d.setDate(d.getDate() + offsetDays); return d.toISOString().slice(0, 10) }

async function clearLeagueCollection(col, leagueId) {
  const snap = await db.collection(col).where('leagueId', '==', leagueId).get()
  if (snap.empty) return
  const batch = db.batch()
  let count = 0
  for (const doc of snap.docs) {
    batch.delete(doc.ref); count++
    if (count >= 500) { await batch.commit(); count = 0 }
  }
  if (count > 0) await batch.commit()
}

const FRONT_PARS = [4, 3, 5, 4, 3, 4, 4, 3, 4]
const FRONT_HCP  = [5, 9, 1, 7, 3, 8, 2, 6, 4]
const BACK_PARS  = [4, 5, 3, 4, 5, 3, 4, 4, 4]
const BACK_HCP   = [10, 2, 16, 6, 14, 18, 4, 12, 8]
const FRONT_PAR_TOTAL = FRONT_PARS.reduce((a, b) => a + b, 0)

const COURSE_NAME = "Kelley's Heroes Golf Club"
const COURSE_ID   = 'kelleys-heroes-gc'

function buildCourse() {
  const holes = [
    ...FRONT_PARS.map((par, i) => ({ hole: i + 1,  par, hcpIndex: FRONT_HCP[i] })),
    ...BACK_PARS.map((par,  i) => ({ hole: i + 10, par, hcpIndex: BACK_HCP[i]  }))
  ]
  return {
    id: COURSE_ID, name: COURSE_NAME,
    address: '7945 Mud Run Rd, Canal Winchester, OH 43110',
    lat: 39.851, lon: -82.799, holes,
    tees: [
      { name: 'White', yards: [325,150,490,355,175,365,325,140,390, 360,515,150,365,480,160,390,340,375] },
      { name: 'Blue',  yards: [350,165,515,380,195,390,350,155,415, 385,540,165,390,505,180,415,365,400] },
      { name: 'Red',   yards: [295,125,455,325,145,335,295,115,355, 325,470,125,330,445,130,350,300,335] }
    ],
    updatedAt: new Date().toISOString()
  }
}

const PLAYERS = [
  { name: 'Ron McCoy',     email: 'ron@mudrun.golf',   phone: '330-555-0101', handicap: 5.2,  team: 1, role: 'admin'  },
  { name: 'Kevin Patel',   email: 'kevin@mudrun.golf', phone: '330-555-0102', handicap: 6.1,  team: 1, role: 'player' },
  { name: 'Tom Brewer',    email: 'tom@mudrun.golf',   phone: '330-555-0103', handicap: 8.4,  team: 2, role: 'scorer' },
  { name: 'Scott Farley',  email: 'scott@mudrun.golf', phone: '330-555-0104', handicap: 9.7,  team: 2, role: 'player' },
  { name: 'Mike Sullivan', email: 'mike@mudrun.golf',  phone: '330-555-0105', handicap: 12.8, team: 3, role: 'player' },
  { name: 'Jim Harmon',    email: 'jim@mudrun.golf',   phone: '330-555-0106', handicap: 14.2, team: 3, role: 'player' },
  { name: 'Mark Tanner',   email: 'mark@mudrun.golf',  phone: '330-555-0107', handicap: 15.9, team: 4, role: 'player' },
  { name: 'Dave Kowalski', email: 'dave@mudrun.golf',  phone: '330-555-0108', handicap: 18.6, team: 4, role: 'player' },
  { name: 'Brian Nolan',   email: 'brian@mudrun.golf', phone: '330-555-0109', handicap: 20.3, team: 5, role: 'player' },
  { name: 'Chris Weston',  email: 'chris@mudrun.golf', phone: '330-555-0110', handicap: 22.0, team: 5, role: 'player' }
]

const HOLE_SCORES = {
  'Ron McCoy':     [ [4,3,5,4,3,4,4,3,5], [4,3,5,4,3,4,4,3,4] ],
  'Kevin Patel':   [ [4,3,5,4,3,4,5,3,4], [4,3,5,4,3,5,4,3,5] ],
  'Tom Brewer':    [ [4,3,5,4,3,5,4,3,5], [5,3,5,4,3,5,4,3,5] ],
  'Scott Farley':  [ [4,4,5,4,3,5,4,3,5], [4,3,6,4,3,5,5,3,5] ],
  'Mike Sullivan': [ [5,3,6,4,3,5,5,4,5], [5,4,6,4,3,5,5,4,5] ],
  'Jim Harmon':    [ [5,4,6,5,3,5,5,3,5], [5,4,6,5,3,5,4,4,5] ],
  'Mark Tanner':   [ [5,4,6,5,4,5,5,3,6], [5,4,6,5,4,5,5,4,5] ],
  'Dave Kowalski': [ [5,4,6,5,4,6,5,4,6], [5,4,7,5,4,6,5,4,6] ],
  'Brian Nolan':   [ [6,4,7,5,4,6,5,4,6], [6,4,7,5,4,6,6,4,7] ],
  'Chris Weston':  [ [6,5,7,5,4,6,6,4,7], [7,5,7,5,4,7,6,4,7] ]
}

const MATCH_GROUPS = {
  1: [{ teamA: 1, teamB: 2 }, { teamA: 3, teamB: 4 }],
  2: [{ teamA: 1, teamB: 3 }, { teamA: 2, teamB: 4 }],
  3: [{ teamA: 1, teamB: 4 }, { teamA: 2, teamB: 5 }]
}
const BYE_TEAMS = { 1: [5], 2: [5] }

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const requiredKey = process.env.SEED_SAMPLE_KEY
  if (requiredKey) {
    const provided = req.headers.get('x-seed-key')
    if (!provided || provided !== requiredKey) return new Response('Unauthorized', { status: 401 })
  }

  const body       = await req.json().catch(() => ({}))
  const leagueId   = body.leagueId   ? normalizeLeagueId(String(body.leagueId).trim())   : 'kelleys-heroes'
  const leagueName = body.leagueName ? String(body.leagueName).trim() : 'Mud Run Golf League'
  const reset      = body.reset !== undefined ? Boolean(body.reset) : true
  const now        = new Date().toISOString()

  await db.collection(COL.leagues).doc(leagueId).set({ id: leagueId, name: leagueName, createdAt: now })

  if (reset) {
    await Promise.all([
      clearLeagueCollection(COL.players, leagueId),
      clearLeagueCollection(COL.teams, leagueId),
      clearLeagueCollection(COL.courses, leagueId),
      clearLeagueCollection(COL.schedule, leagueId),
      clearLeagueCollection(COL.pairings, leagueId),
      clearLeagueCollection(COL.scores, leagueId),
      clearLeagueCollection(COL.scorecardLocks, leagueId),
      clearLeagueCollection(COL.matchScorecards, leagueId),
      clearLeagueCollection(COL.sideGameOptins, leagueId),
      clearLeagueCollection(COL.sideGamesLedger, leagueId),
      clearLeagueCollection(COL.payments, leagueId),
      clearLeagueCollection(COL.chat, leagueId),
    ])
    await db.collection(COL.leagueSettings).doc(leagueId).delete().catch(() => null)
    await db.collection(COL.handicapConfig).doc(leagueId).delete().catch(() => null)
    await db.collection(COL.paymentSettings).doc(leagueId).delete().catch(() => null)
  }

  // League settings
  await db.collection(COL.leagueSettings).doc(leagueId).set({
    leagueId, leagueName, seasonStart: isoDate(0), seasonEnd: isoDate(70),
    teePlacementsCount: 3, handicapMode: 'custom',
    customFormulaText: 'Best 4 of last 8 rounds × 0.96, max 36',
    netSkinsSeasonPot: 200, grossSkinsSeasonPot: 200, fiftyFiftySeasonBuyIn: 10,
    scoringMode: 'batch', updatedAt: now
  })

  // Handicap formula
  await db.collection(COL.handicapConfig).doc(leagueId).set({
    leagueId, bestN: 4, lastN: 8, multiplier: 0.96, maxHcp: 36, minRounds: 2, bonus: 'none', updatedAt: now
  })

  // Course
  await setDoc(COL.courses, leagueId, COURSE_ID, buildCourse())

  // Players + roles
  for (const p of PLAYERS) {
    const email = ne(p.email)
    await setDoc(COL.players, leagueId, email, { name: p.name, email, phone: p.phone, handicap: p.handicap, createdAt: now, updatedAt: now })
    await db.collection(COL.users).doc(email).set({ email, role: p.role, updatedAt: now }, { merge: true })
  }

  // Teams
  const teamMap = new Map()
  for (let t = 1; t <= 5; t++) {
    const members = PLAYERS.filter(p => p.team === t)
    const p1 = ne(members[0].email), p2 = ne(members[1].email)
    await setDoc(COL.teams, leagueId, `team-${t}`, { teamNumber: t, player1Email: p1, player2Email: p2, updatedAt: now })
    teamMap.set(t, { player1Email: p1, player2Email: p2, members })
  }

  // Schedule (10 weeks)
  for (let w = 1; w <= 10; w++) {
    const scramble = w === 10
    await setDoc(COL.schedule, leagueId, `week-${w}`, {
      week: w, date: isoDate((w - 1) * 7),
      title: scramble ? `Week ${w} — Scramble` : `Week ${w} — Match Play`,
      course: COURSE_NAME, teeTime: '5:30 PM',
      type: scramble ? 'scramble' : 'match', side: w <= 5 ? 'front' : 'back',
      updatedAt: now
    })
  }

  // Pairings wks 1-3
  for (let w = 1; w <= 3; w++) {
    const matchups = MATCH_GROUPS[w] || []
    const byes = BYE_TEAMS[w] || []
    const groups = []
    for (let gi = 0; gi < matchups.length; gi++) {
      const { teamA, teamB } = matchups[gi]
      const t1 = teamMap.get(teamA), t2 = teamMap.get(teamB)
      groups.push({ id: `w${w}-g${gi + 1}`, players: [...t1.members, ...t2.members].map(p => ({ name: p.name, email: ne(p.email) })) })
    }
    for (let bi = 0; bi < byes.length; bi++) {
      const t = teamMap.get(byes[bi])
      groups.push({ id: `w${w}-bye${bi + 1}`, players: t.members.map(p => ({ name: p.name, email: ne(p.email) })) })
    }
    await setDoc(COL.pairings, leagueId, `week-${w}`, { week: w, groups, mode: 'manual', updatedAt: now, updatedBy: ne(PLAYERS[0].email) })
  }

  // Side-game opt-ins
  for (const p of PLAYERS) {
    await setDoc(COL.sideGameOptins, leagueId, ne(p.email), { email: ne(p.email), netSkins: { enabled: true, joinedWeek: 1 }, grossSkins: { enabled: true, joinedWeek: 1 }, fiftyFifty: { enabled: true, joinedWeek: 1 }, updatedAt: now })
  }

  // Match scorecards + score records + locks (wks 1-2 final, 3 draft)
  const parTotal = FRONT_PAR_TOTAL
  let totalMatchCards = 0, totalScoreRecords = 0

  for (let w = 1; w <= 3; w++) {
    const status = w <= 2 ? 'final' : 'draft'
    const date = isoDate((w - 1) * 7)
    const submittedAt = new Date(Date.now() - (3 - w) * 7 * 86400000).toISOString()
    const matchups = MATCH_GROUPS[w] || []

    for (const { teamA, teamB } of matchups) {
      const t1 = teamMap.get(teamA), t2 = teamMap.get(teamB)
      const allMembers = [...t1.members, ...t2.members]
      const playerPayloads = allMembers.map(pd => {
        const holes = HOLE_SCORES[pd.name] ? HOLE_SCORES[pd.name][w - 1] : null
        const grossTotal = holes ? holes.reduce((a, b) => a + b, 0) : null
        return { email: ne(pd.email), name: pd.name, holes: holes || new Array(9).fill(null), grossTotal, handicapSnapshot: pd.handicap }
      })

      const a = Math.min(teamA, teamB), b = Math.max(teamA, teamB)
      const matchKey = `week-${w}-match-${a}-vs-${b}`
      await setDoc(COL.matchScorecards, leagueId, matchKey, { key: matchKey, week: w, teamA, teamB, date, course: COURSE_NAME, tee: 'White', side: 'front', players: playerPayloads, parTotal, status, submittedBy: ne(PLAYERS[0].email), submittedAt })
      totalMatchCards++

      if (status === 'final') {
        for (const pp of playerPayloads) {
          if (pp.grossTotal === null) continue
          const nameLower = String(pp.name).toLowerCase()
          const emailLower = ne(pp.email)
          await addDoc(COL.scores, leagueId, { player: pp.name, playerEmail: emailLower, week: w, date, course: COURSE_NAME, tee: 'White', side: 'front', holes: pp.holes, grossTotal: pp.grossTotal, handicapSnapshot: pp.handicapSnapshot, parTotal, stats: null, status: 'final', submittedBy: ne(PLAYERS[0].email), submittedAt, fromMatchScorecard: matchKey })
          totalScoreRecords++
          const lock = { locked: true, lockedAt: submittedAt, reason: 'match_scorecard' }
          await db.collection(COL.scorecardLocks).doc(lid(leagueId, `lock-${nameLower}-week-${w}`)).set({ leagueId, ...lock })
          await db.collection(COL.scorecardLocks).doc(lid(leagueId, `lock-email-${emailLower}-week-${w}`)).set({ leagueId, ...lock })
        }
      }
    }

    if (status === 'final') {
      for (const teamNum of (BYE_TEAMS[w] || [])) {
        const t = teamMap.get(teamNum)
        for (const pd of t.members) {
          const holes = HOLE_SCORES[pd.name] ? HOLE_SCORES[pd.name][w - 1] : null
          if (!holes) continue
          const grossTotal = holes.reduce((a, b) => a + b, 0)
          const nameLower = String(pd.name).toLowerCase()
          const emailLower = ne(pd.email)
          await addDoc(COL.scores, leagueId, { player: pd.name, playerEmail: emailLower, week: w, date, course: COURSE_NAME, tee: 'White', side: 'front', holes, grossTotal, handicapSnapshot: pd.handicap, parTotal, stats: null, status: 'final', submittedBy: ne(PLAYERS[0].email), submittedAt })
          totalScoreRecords++
          const lock = { locked: true, lockedAt: submittedAt, reason: 'individual_final' }
          await db.collection(COL.scorecardLocks).doc(lid(leagueId, `lock-${nameLower}-week-${w}`)).set({ leagueId, ...lock })
          await db.collection(COL.scorecardLocks).doc(lid(leagueId, `lock-email-${emailLower}-week-${w}`)).set({ leagueId, ...lock })
        }
      }
    }
  }

  // Payment settings + records
  const payCategories = [
    { id: 'league_dues',  name: 'League Dues',  amount: 120, active: true },
    { id: 'net_skins',    name: 'Net Skins',    amount: 20,  active: true },
    { id: 'gross_skins',  name: 'Gross Skins',  amount: 20,  active: true },
    { id: 'fifty_fifty',  name: '50/50',         amount: 10,  active: true },
    { id: 'events',       name: 'Events',        amount: 30,  active: true }
  ]
  await db.collection(COL.paymentSettings).doc(leagueId).set({ leagueId, categories: payCategories, updatedAt: now })

  const payments = [
    { email: 'ron@mudrun.golf',   cat: 'league_dues',  amt: 120, method: 'venmo', note: 'Paid in full' },
    { email: 'kevin@mudrun.golf', cat: 'league_dues',  amt: 120, method: 'venmo', note: 'Paid in full' },
    { email: 'tom@mudrun.golf',   cat: 'league_dues',  amt: 120, method: 'check', note: '' },
    { email: 'scott@mudrun.golf', cat: 'league_dues',  amt: 60,  method: 'cash',  note: 'Half payment' },
    { email: 'mike@mudrun.golf',  cat: 'league_dues',  amt: 120, method: 'venmo', note: '' },
    { email: 'jim@mudrun.golf',   cat: 'league_dues',  amt: 120, method: 'venmo', note: '' },
    { email: 'dave@mudrun.golf',  cat: 'league_dues',  amt: 120, method: 'cash',  note: '' },
    { email: 'ron@mudrun.golf',   cat: 'net_skins',    amt: 20,  method: 'venmo', note: '' },
    { email: 'kevin@mudrun.golf', cat: 'net_skins',    amt: 20,  method: 'venmo', note: '' },
    { email: 'tom@mudrun.golf',   cat: 'gross_skins',  amt: 20,  method: 'venmo', note: '' },
    { email: 'ron@mudrun.golf',   cat: 'fifty_fifty',  amt: 10,  method: 'venmo', note: '' },
    { email: 'scott@mudrun.golf', cat: 'fifty_fifty',  amt: 10,  method: 'cash',  note: '' },
    { email: 'mike@mudrun.golf',  cat: 'fifty_fifty',  amt: 10,  method: 'cash',  note: '' }
  ]
  for (const t of payments) {
    if (!t.amt) continue
    await addDoc(COL.payments, leagueId, { email: ne(t.email), categoryId: t.cat, amount: t.amt, method: t.method, note: t.note, recordedBy: ne(PLAYERS[0].email), createdAt: now })
  }

  // Chat
  const msgs = [
    { user: 'Ron McCoy',   email: 'ron@mudrun.golf',   msg: `Welcome to ${leagueName}! Season is underway — check the leaderboard for current standings.` },
    { user: 'Tom Brewer',  email: 'tom@mudrun.golf',   msg: 'Great rounds week 1! Who had the low net? Checking the skins ledger now.' },
    { user: 'Kevin Patel', email: 'kevin@mudrun.golf', msg: 'Week 3 scorecards are in draft — Ron needs to finalize when ready.' }
  ]
  for (const m of msgs) {
    const k = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
    await setDoc(COL.chat, leagueId, k, { id: k, user: m.user, email: ne(m.email), msg: m.msg, createdAt: now })
  }

  return Response.json({
    success: true, leagueId, leagueName,
    seeded: { players: PLAYERS.length, teams: 5, course: COURSE_NAME, scheduleWeeks: 10, pairingsSeeded: 3, sideGameOptIns: PLAYERS.length, matchScorecards: totalMatchCards, scoreRecords: totalScoreRecords, payments: payments.filter(p => p.amt > 0).length, chatMessages: msgs.length },
    players: PLAYERS.map(p => ({ name: p.name, email: p.email, phone: p.phone, handicap: p.handicap, team: p.team, role: p.role })),
    nextSteps: [`POST /api/finalize-week?leagueId=${leagueId}  body: { "week": 1 }`, `POST /api/finalize-week?leagueId=${leagueId}  body: { "week": 2 }`, 'After finalize-week, handicaps recalculate and side-games ledger computes']
  })
}

export const config = { path: '/api/load-sample-data' }
