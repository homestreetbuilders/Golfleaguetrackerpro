/**
 * seed-kelleys-heroes.mjs
 * POST /api/seed-kelleys-heroes
 *
 * Chunked seeder to avoid 504 timeouts. Use the `action` field in the body:
 *
 *   { action: 'init', reset: true }
 *     → Seeds league record, settings, course, players, teams, schedule,
 *       pairings, side-game opt-ins, payments, chat. Fast (<3 s).
 *
 *   { action: 'week', week: N }   (N = 1..6)
 *     → Seeds match scorecards + score records + locks for week N, then
 *       calls finalize-week and side-games-ledger for that week. Fast (<3 s).
 *
 * Backward-compatible: omitting `action` defaults to 'init'.
 * Old callers passing { reset: true } with no action still run init only.
 *
 * Optional env: SEED_SAMPLE_KEY — send as x-seed-key header.
 */

import { db, COL, lid, setDoc, addDoc } from './_firebase.mjs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ne(email) { return String(email || '').trim().toLowerCase() }

function getSiteBaseUrl(req) {
  const envUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL
  if (envUrl) return String(envUrl).replace(/\/$/, '')
  const host = req && req.headers ? (req.headers.get('x-forwarded-host') || req.headers.get('host')) : null
  const proto = req && req.headers ? (req.headers.get('x-forwarded-proto') || 'https') : 'https'
  return host ? `${proto}://${host}` : null
}

async function clearLeagueCollection(col, leagueId) {
  const snap = await db.collection(col).where('leagueId', '==', leagueId).get()
  if (snap.empty) return
  const batch = db.batch()
  let count = 0
  for (const doc of snap.docs) {
    batch.delete(doc.ref)
    count++
    if (count >= 500) { await batch.commit(); count = 0 }
  }
  if (count > 0) await batch.commit()
}

// ─── League constants ─────────────────────────────────────────────────────────

const LEAGUE_ID   = 'kelleys-heroes'
const LEAGUE_NAME = 'Kelleys Heroes'
const COURSE_NAME = 'Goodpark G.C.'
const COURSE_ID   = 'goodpark-gc'

const FRONT_PARS = [4, 3, 4, 5, 3, 4, 5, 3, 4]   // par 35
const FRONT_HCP  = [3, 9, 1, 5, 7, 2, 8, 6, 4]
const PAR_TOTAL  = FRONT_PARS.reduce((a, b) => a + b, 0)  // 35

const WEEK_DATES = [
  '2026-03-25', '2026-04-01', '2026-04-08',
  '2026-04-15', '2026-04-22', '2026-04-29'
]

function buildCourse() {
  const frontHoles = FRONT_PARS.map((par, i) => ({ hole: i + 1, par, hcpIndex: FRONT_HCP[i] }))
  const backPars  = [4, 5, 3, 4, 5, 3, 4, 4, 4]
  const backHcp   = [10, 2, 16, 6, 14, 18, 4, 12, 8]
  const backHoles = backPars.map((par, i) => ({ hole: i + 10, par, hcpIndex: backHcp[i] }))
  return {
    id: COURSE_ID, name: COURSE_NAME,
    address: '1 Goodpark Drive, Columbus, OH 43215',
    lat: 39.9612, lon: -82.9988,
    holes: [...frontHoles, ...backHoles],
    tees: [
      { name: 'White', yards: [315,145,375,460,165,350,490,140,380, 350,485,160,370,450,150,375,330,360] },
      { name: 'Blue',  yards: [335,165,395,480,185,370,510,160,400, 370,510,175,390,470,170,395,355,385] },
      { name: 'Red',   yards: [285,125,345,420,140,315,450,120,345, 315,440,135,335,415,130,345,295,325] }
    ],
    updatedAt: new Date().toISOString()
  }
}

const PLAYERS = [
  { name: 'Ronald McCoy',  email: 'ronald@kelleysheros.golf', phone: '330-555-0101', handicap: 12, team: 1, role: 'admin'  },
  { name: 'Tom Harris',    email: 'tom@kelleysheros.golf',    phone: '330-555-0102', handicap: 18, team: 1, role: 'scorer' },
  { name: 'Mike Johnson',  email: 'mike@kelleysheros.golf',   phone: '330-555-0103', handicap: 8,  team: 2, role: 'player' },
  { name: 'Dave Wilson',   email: 'dave@kelleysheros.golf',   phone: '330-555-0104', handicap: 22, team: 2, role: 'player' },
  { name: 'Chris Brown',   email: 'chris@kelleysheros.golf',  phone: '330-555-0105', handicap: 15, team: 3, role: 'player' },
  { name: 'Steve Davis',   email: 'steve@kelleysheros.golf',  phone: '330-555-0106', handicap: 11, team: 3, role: 'player' },
  { name: 'Bob Miller',    email: 'bob@kelleysheros.golf',    phone: '330-555-0107', handicap: 19, team: 4, role: 'player' },
  { name: 'Jim Anderson',  email: 'jim@kelleysheros.golf',    phone: '330-555-0108', handicap: 6,  team: 4, role: 'player' },
  { name: 'Gary Thompson', email: 'gary@kelleysheros.golf',   phone: '330-555-0109', handicap: 14, team: 5, role: 'player' },
  { name: 'Rick Martinez', email: 'rick@kelleysheros.golf',   phone: '330-555-0110', handicap: 24, team: 5, role: 'player' }
]

const TEAMS = [
  { teamNumber: 1, teamName: 'Birdie Kings',    p1: 'Ronald McCoy',  p2: 'Tom Harris'    },
  { teamNumber: 2, teamName: 'Eagles',           p1: 'Mike Johnson',  p2: 'Dave Wilson'   },
  { teamNumber: 3, teamName: 'Par Busters',      p1: 'Chris Brown',   p2: 'Steve Davis'   },
  { teamNumber: 4, teamName: 'Bogeys',           p1: 'Bob Miller',    p2: 'Jim Anderson'  },
  { teamNumber: 5, teamName: 'Fairway Warriors', p1: 'Gary Thompson', p2: 'Rick Martinez' }
]

const HOLE_SCORES = {
  'Jim Anderson': [
    [4,3,4,5,3,4,5,3,4],[4,3,4,5,3,5,5,4,4],[4,3,4,5,3,5,5,3,4],
    [4,3,4,5,3,4,5,4,4],[4,3,4,5,3,4,5,3,4],[4,3,5,5,3,5,5,4,4]
  ],
  'Mike Johnson': [
    [4,3,4,5,3,5,5,4,4],[4,3,4,5,3,4,5,4,4],[5,3,5,5,3,5,5,4,4],
    [4,3,4,5,4,4,5,4,4],[4,3,4,5,4,5,5,4,4],[4,3,5,5,3,4,5,4,4]
  ],
  'Steve Davis': [
    [5,3,5,5,3,5,5,4,4],[5,3,4,6,3,5,5,4,5],[5,3,4,5,3,5,5,4,4],
    [5,3,5,6,3,5,5,4,4],[5,3,4,5,3,5,5,5,4],[5,3,5,5,3,4,5,4,4]
  ],
  'Ronald McCoy': [
    [5,3,5,6,3,5,5,4,4],[5,4,5,6,3,5,5,4,4],[5,4,5,6,3,5,5,4,4],
    [5,3,4,5,3,5,5,5,4],[5,4,5,6,3,5,5,4,4],[5,3,5,5,3,5,5,5,4]
  ],
  'Gary Thompson': [
    [5,3,5,6,4,5,6,4,4],[5,4,5,6,3,5,6,4,4],[5,4,5,6,3,5,6,4,4],
    [5,4,5,6,3,5,6,4,4],[5,4,5,5,3,5,5,5,4],[5,4,5,5,3,5,5,5,4]
  ],
  'Chris Brown': [
    [5,3,5,6,4,5,6,4,4],[5,4,5,6,3,5,6,5,4],[5,4,5,6,4,5,6,4,4],
    [5,3,5,5,3,5,6,5,4],[5,4,5,6,4,5,6,4,4],[5,4,5,6,3,5,6,4,4]
  ],
  'Tom Harris': [
    [5,4,5,6,4,5,6,5,4],[5,4,6,6,4,5,6,5,4],[5,4,6,6,4,5,6,5,4],
    [5,4,5,6,4,5,6,5,4],[5,4,5,6,4,5,6,5,4],[5,4,6,6,3,5,6,5,4]
  ],
  'Bob Miller': [
    [5,4,5,7,4,5,6,5,4],[5,4,5,7,4,6,6,5,4],[5,4,6,7,4,5,6,5,4],
    [5,4,5,6,4,5,6,6,4],[5,4,5,7,4,5,6,5,4],[5,5,5,7,4,5,7,5,4]
  ],
  'Dave Wilson': [
    [6,4,5,7,4,6,7,5,4],[6,4,5,7,4,6,7,5,4],[6,4,5,7,5,6,7,5,4],
    [5,4,5,7,4,6,7,5,4],[6,4,5,7,4,6,7,5,4],[6,4,5,7,5,6,7,5,4]
  ],
  'Rick Martinez': [
    [6,5,6,7,5,6,7,5,4],[7,5,6,7,4,6,7,5,5],[6,5,7,7,4,6,6,5,5],
    [7,5,6,7,5,6,6,5,5],[6,5,6,7,4,6,6,5,5],[6,5,6,7,5,6,6,5,5]
  ]
}

const MATCH_SCHEDULE = [
  { week: 1, matches: [{ teamA: 1, teamB: 2 }, { teamA: 3, teamB: 4 }], byeTeam: 5 },
  { week: 2, matches: [{ teamA: 1, teamB: 3 }, { teamA: 2, teamB: 5 }], byeTeam: 4 },
  { week: 3, matches: [{ teamA: 1, teamB: 4 }, { teamA: 3, teamB: 5 }], byeTeam: 2 },
  { week: 4, matches: [{ teamA: 1, teamB: 5 }, { teamA: 2, teamB: 4 }], byeTeam: 3 },
  { week: 5, matches: [{ teamA: 2, teamB: 3 }, { teamA: 4, teamB: 5 }], byeTeam: 1 },
  { week: 6, matches: [{ teamA: 1, teamB: 2 }, { teamA: 3, teamB: 5 }], byeTeam: 4 }
]

// ─── Handler: init ────────────────────────────────────────────────────────────

async function handleInit(reset) {
  const now = new Date().toISOString()

  if (reset) {
    await Promise.all([
      clearLeagueCollection(COL.players, LEAGUE_ID),
      clearLeagueCollection(COL.teams, LEAGUE_ID),
      clearLeagueCollection(COL.schedule, LEAGUE_ID),
      clearLeagueCollection(COL.pairings, LEAGUE_ID),
      clearLeagueCollection(COL.scores, LEAGUE_ID),
      clearLeagueCollection(COL.scorecardLocks, LEAGUE_ID),
      clearLeagueCollection(COL.matchScorecards, LEAGUE_ID),
      clearLeagueCollection(COL.sideGameOptins, LEAGUE_ID),
      clearLeagueCollection(COL.sideGamesLedger, LEAGUE_ID),
      clearLeagueCollection(COL.payments, LEAGUE_ID),
      clearLeagueCollection(COL.chat, LEAGUE_ID),
      clearLeagueCollection(COL.courses, LEAGUE_ID),
    ])
  }

  // Global league record
  await db.collection(COL.leagues).doc(LEAGUE_ID).set({
    id: LEAGUE_ID, name: LEAGUE_NAME, createdAt: now
  })

  // League settings
  await db.collection(COL.leagueSettings).doc(LEAGUE_ID).set({
    leagueId: LEAGUE_ID, leagueName: LEAGUE_NAME,
    seasonStart: WEEK_DATES[0], seasonEnd: WEEK_DATES[5],
    handicapMode: 'custom', customFormulaText: 'Best 4 of last 8 rounds × 0.96, max 36',
    netSkinsSeasonPot: 120, grossSkinsSeasonPot: 120, fiftyFiftySeasonBuyIn: 30,
    updatedAt: now
  })

  // Handicap formula
  await db.collection(COL.handicapConfig).doc(LEAGUE_ID).set({
    leagueId: LEAGUE_ID, bestN: 4, lastN: 8, multiplier: 0.96,
    maxHcp: 36, minRounds: 3, updatedAt: now
  })

  // Course
  await setDoc(COL.courses, LEAGUE_ID, COURSE_ID, buildCourse())

  const playerByName = new Map(PLAYERS.map(p => [p.name, p]))
  const teamByNumber = new Map(TEAMS.map(t => [t.teamNumber, t]))

  // Players + roles
  for (const p of PLAYERS) {
    const email = ne(p.email)
    await setDoc(COL.players, LEAGUE_ID, email, {
      name: p.name, email, phone: p.phone,
      handicap: p.handicap, createdAt: now, updatedAt: now
    })
    await db.collection(COL.users).doc(email).set(
      { email, role: p.role, updatedAt: now }, { merge: true }
    )
  }

  // Teams
  for (const t of TEAMS) {
    const p1 = playerByName.get(t.p1)
    const p2 = playerByName.get(t.p2)
    await setDoc(COL.teams, LEAGUE_ID, `team-${t.teamNumber}`, {
      teamNumber: t.teamNumber, teamName: t.teamName,
      player1Email: ne(p1.email), player2Email: ne(p2.email),
      updatedAt: now
    })
  }

  // Schedule (6 weeks)
  for (const wk of MATCH_SCHEDULE) {
    const w = wk.week
    await setDoc(COL.schedule, LEAGUE_ID, `week-${w}`, {
      week: w, date: WEEK_DATES[w - 1], title: `Week ${w} — Match Play`,
      course: COURSE_NAME, teeTime: '5:30 PM', type: 'match', side: 'front',
      matches: wk.matches, updatedAt: now
    })
  }

  // Pairings (all 6 weeks)
  for (const wk of MATCH_SCHEDULE) {
    const groups = []
    for (let gi = 0; gi < wk.matches.length; gi++) {
      const { teamA, teamB } = wk.matches[gi]
      const tA = teamByNumber.get(teamA)
      const tB = teamByNumber.get(teamB)
      const members = [tA.p1, tA.p2, tB.p1, tB.p2].map(name => {
        const p = playerByName.get(name)
        return { name: p.name, email: ne(p.email) }
      })
      groups.push({ id: `w${wk.week}-g${gi + 1}`, players: members })
    }
    const byeT = teamByNumber.get(wk.byeTeam)
    groups.push({
      id: `w${wk.week}-bye`,
      players: [byeT.p1, byeT.p2].map(name => {
        const p = playerByName.get(name)
        return { name: p.name, email: ne(p.email) }
      })
    })
    await setDoc(COL.pairings, LEAGUE_ID, `week-${wk.week}`, {
      week: wk.week, groups, mode: 'manual',
      updatedAt: now, updatedBy: ne(PLAYERS[0].email)
    })
  }

  // Side-game opt-ins
  for (const p of PLAYERS) {
    await setDoc(COL.sideGameOptins, LEAGUE_ID, ne(p.email), {
      email: ne(p.email),
      netSkins:   { enabled: true, joinedWeek: 1 },
      grossSkins: { enabled: true, joinedWeek: 1 },
      fiftyFifty: { enabled: true, joinedWeek: 1 },
      updatedAt: now
    })
  }

  // Payment settings
  const payCategories = [
    { id: 'league_dues',  name: 'League Dues',  amount: 9,   active: true },
    { id: 'fifty_fifty',  name: '50/50',         amount: 30,  active: true },
    { id: 'net_skins',    name: 'Net Skins',     amount: 12,  active: true },
    { id: 'gross_skins',  name: 'Gross Skins',   amount: 12,  active: true }
  ]
  await db.collection(COL.paymentSettings).doc(LEAGUE_ID).set(
    { leagueId: LEAGUE_ID, categories: payCategories, updatedAt: now }
  )

  // Payment records
  const payments = [
    { email: 'ronald@kelleysheros.golf', cat: 'league_dues', amt: 9,  method: 'venmo', note: 'Paid in full' },
    { email: 'tom@kelleysheros.golf',    cat: 'league_dues', amt: 9,  method: 'venmo', note: '' },
    { email: 'mike@kelleysheros.golf',   cat: 'league_dues', amt: 9,  method: 'cash',  note: '' },
    { email: 'dave@kelleysheros.golf',   cat: 'league_dues', amt: 9,  method: 'check', note: '' },
    { email: 'chris@kelleysheros.golf',  cat: 'league_dues', amt: 9,  method: 'venmo', note: '' },
    { email: 'steve@kelleysheros.golf',  cat: 'league_dues', amt: 9,  method: 'venmo', note: '' },
    { email: 'bob@kelleysheros.golf',    cat: 'league_dues', amt: 9,  method: 'cash',  note: '' },
    { email: 'jim@kelleysheros.golf',    cat: 'league_dues', amt: 9,  method: 'venmo', note: '' },
    { email: 'gary@kelleysheros.golf',   cat: 'league_dues', amt: 9,  method: 'venmo', note: '' },
    // Rick hasn't paid dues yet
    { email: 'ronald@kelleysheros.golf', cat: 'fifty_fifty', amt: 30, method: 'venmo', note: '' },
    { email: 'tom@kelleysheros.golf',    cat: 'fifty_fifty', amt: 30, method: 'venmo', note: '' },
    { email: 'mike@kelleysheros.golf',   cat: 'fifty_fifty', amt: 30, method: 'cash',  note: '' },
    { email: 'dave@kelleysheros.golf',   cat: 'fifty_fifty', amt: 30, method: 'venmo', note: '' },
    { email: 'chris@kelleysheros.golf',  cat: 'fifty_fifty', amt: 30, method: 'venmo', note: '' },
    { email: 'steve@kelleysheros.golf',  cat: 'fifty_fifty', amt: 30, method: 'cash',  note: '' },
    { email: 'bob@kelleysheros.golf',    cat: 'fifty_fifty', amt: 30, method: 'venmo', note: '' },
    { email: 'jim@kelleysheros.golf',    cat: 'fifty_fifty', amt: 30, method: 'venmo', note: '' },
    { email: 'gary@kelleysheros.golf',   cat: 'fifty_fifty', amt: 30, method: 'venmo', note: '' },
    { email: 'rick@kelleysheros.golf',   cat: 'fifty_fifty', amt: 30, method: 'cash',  note: '' },
    { email: 'ronald@kelleysheros.golf', cat: 'net_skins',   amt: 12, method: 'venmo', note: '' },
    { email: 'tom@kelleysheros.golf',    cat: 'net_skins',   amt: 12, method: 'venmo', note: '' },
    { email: 'mike@kelleysheros.golf',   cat: 'net_skins',   amt: 12, method: 'cash',  note: '' },
    { email: 'dave@kelleysheros.golf',   cat: 'net_skins',   amt: 12, method: 'venmo', note: '' },
    { email: 'chris@kelleysheros.golf',  cat: 'net_skins',   amt: 12, method: 'venmo', note: '' },
    { email: 'steve@kelleysheros.golf',  cat: 'net_skins',   amt: 12, method: 'cash',  note: '' },
    { email: 'bob@kelleysheros.golf',    cat: 'net_skins',   amt: 12, method: 'venmo', note: '' },
    { email: 'jim@kelleysheros.golf',    cat: 'net_skins',   amt: 12, method: 'venmo', note: '' },
    { email: 'gary@kelleysheros.golf',   cat: 'net_skins',   amt: 12, method: 'venmo', note: '' },
    { email: 'rick@kelleysheros.golf',   cat: 'net_skins',   amt: 12, method: 'cash',  note: '' },
    { email: 'ronald@kelleysheros.golf', cat: 'gross_skins', amt: 12, method: 'venmo', note: '' },
    { email: 'tom@kelleysheros.golf',    cat: 'gross_skins', amt: 12, method: 'venmo', note: '' },
    { email: 'mike@kelleysheros.golf',   cat: 'gross_skins', amt: 12, method: 'cash',  note: '' },
    { email: 'dave@kelleysheros.golf',   cat: 'gross_skins', amt: 12, method: 'venmo', note: '' },
    { email: 'chris@kelleysheros.golf',  cat: 'gross_skins', amt: 12, method: 'venmo', note: '' },
    { email: 'steve@kelleysheros.golf',  cat: 'gross_skins', amt: 12, method: 'cash',  note: '' },
    { email: 'bob@kelleysheros.golf',    cat: 'gross_skins', amt: 12, method: 'venmo', note: '' },
    { email: 'jim@kelleysheros.golf',    cat: 'gross_skins', amt: 12, method: 'venmo', note: '' },
    { email: 'gary@kelleysheros.golf',   cat: 'gross_skins', amt: 12, method: 'venmo', note: '' },
    { email: 'rick@kelleysheros.golf',   cat: 'gross_skins', amt: 12, method: 'cash',  note: '' }
  ]
  for (const t of payments) {
    await addDoc(COL.payments, LEAGUE_ID, {
      email: ne(t.email), categoryId: t.cat, amount: t.amt,
      method: t.method, note: t.note,
      recordedBy: ne(PLAYERS[0].email), createdAt: now
    })
  }

  // Chat messages
  const msgs = [
    { user: 'Ronald McCoy',  email: 'ronald@kelleysheros.golf', msg: `Welcome to ${LEAGUE_NAME}! Season is underway — 6 weeks down, check the leaderboard for standings.` },
    { user: 'Jim Anderson',  email: 'jim@kelleysheros.golf',    msg: 'Shot par on week 1 and week 5! Best rounds of my life at Goodpark.' },
    { user: 'Mike Johnson',  email: 'mike@kelleysheros.golf',   msg: 'Week 2 was mine. 36 gross, low net. Eagles flying high!' },
    { user: 'Steve Davis',   email: 'steve@kelleysheros.golf',  msg: 'Week 3 low net — Par Busters coming on strong.' },
    { user: 'Tom Harris',    email: 'tom@kelleysheros.golf',    msg: "Consistent rounds every week. Birdie Kings aren't done yet." }
  ]
  for (const m of msgs) {
    const k = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
    await setDoc(COL.chat, LEAGUE_ID, k, {
      id: k, user: m.user, email: ne(m.email), msg: m.msg, createdAt: now
    })
  }

  return Response.json({
    success: true, action: 'init', leagueId: LEAGUE_ID, leagueName: LEAGUE_NAME,
    seeded: { players: PLAYERS.length, teams: TEAMS.length, course: COURSE_NAME, scheduleWeeks: 6, pairingsSeeded: 6, sideGameOptIns: PLAYERS.length, payments: payments.length, chatMessages: msgs.length },
    next: 'Call POST /api/seed-kelleys-heroes with { action: "week", week: N } for N = 1..6'
  })
}

// ─── Handler: week ────────────────────────────────────────────────────────────

async function handleWeek(req, week) {
  const teamByNumber = new Map(TEAMS.map(t => [t.teamNumber, t]))
  const playerByName = new Map(PLAYERS.map(p => [p.name, p]))

  const now         = new Date().toISOString()
  const date        = WEEK_DATES[week - 1]
  const status      = 'final'
  const submittedAt = new Date(Date.now() - (7 - week) * 7 * 86_400_000).toISOString()
  const wk          = MATCH_SCHEDULE[week - 1]

  let totalMatchCards   = 0
  let totalScoreRecords = 0

  for (const { teamA, teamB } of wk.matches) {
    const tA = teamByNumber.get(teamA)
    const tB = teamByNumber.get(teamB)
    const allMembers = [tA.p1, tA.p2, tB.p1, tB.p2]

    const playerPayloads = allMembers.map(name => {
      const p    = playerByName.get(name)
      const hArr = HOLE_SCORES[name] ? HOLE_SCORES[name][week - 1] : null
      const gross = hArr ? hArr.reduce((a, b) => a + b, 0) : null
      return { email: ne(p.email), name: p.name, holes: hArr || new Array(9).fill(null), grossTotal: gross, handicapSnapshot: p.handicap }
    })

    const a = Math.min(teamA, teamB)
    const b = Math.max(teamA, teamB)
    const matchKey = `week-${week}-match-${a}-vs-${b}`

    await setDoc(COL.matchScorecards, LEAGUE_ID, matchKey, {
      key: matchKey, week, teamA, teamB, date,
      course: COURSE_NAME, tee: 'White', side: 'front',
      players: playerPayloads, parTotal: PAR_TOTAL, status,
      submittedBy: ne(PLAYERS[0].email), submittedAt
    })
    totalMatchCards++

    for (const pp of playerPayloads) {
      if (pp.grossTotal === null) continue
      const nameLower  = String(pp.name).toLowerCase()
      const emailLower = ne(pp.email)

      await addDoc(COL.scores, LEAGUE_ID, {
        player: pp.name, playerEmail: emailLower, week, date,
        course: COURSE_NAME, tee: 'White', side: 'front',
        holes: pp.holes, grossTotal: pp.grossTotal,
        handicapSnapshot: pp.handicapSnapshot, parTotal: PAR_TOTAL,
        stats: null, status, submittedBy: ne(PLAYERS[0].email), submittedAt,
        fromMatchScorecard: matchKey
      })
      totalScoreRecords++

      const lock = { locked: true, lockedAt: submittedAt, reason: 'match_scorecard_seeded' }
      await db.collection(COL.scorecardLocks).doc(lid(LEAGUE_ID, `lock-${nameLower}-week-${week}`)).set({ leagueId: LEAGUE_ID, ...lock })
      await db.collection(COL.scorecardLocks).doc(lid(LEAGUE_ID, `lock-email-${emailLower}-week-${week}`)).set({ leagueId: LEAGUE_ID, ...lock })
    }
  }

  // Bye-team individual rounds
  const byeT = teamByNumber.get(wk.byeTeam)
  for (const name of [byeT.p1, byeT.p2]) {
    const p      = playerByName.get(name)
    const hArr   = HOLE_SCORES[name] ? HOLE_SCORES[name][week - 1] : null
    if (!hArr) continue
    const gross      = hArr.reduce((a, b) => a + b, 0)
    const nameLower  = String(p.name).toLowerCase()
    const emailLower = ne(p.email)

    await addDoc(COL.scores, LEAGUE_ID, {
      player: p.name, playerEmail: emailLower, week, date,
      course: COURSE_NAME, tee: 'White', side: 'front',
      holes: hArr, grossTotal: gross, handicapSnapshot: p.handicap, parTotal: PAR_TOTAL,
      stats: null, status, submittedBy: ne(PLAYERS[0].email), submittedAt
    })
    totalScoreRecords++

    const lock = { locked: true, lockedAt: submittedAt, reason: 'individual_seeded' }
    await db.collection(COL.scorecardLocks).doc(lid(LEAGUE_ID, `lock-${nameLower}-week-${week}`)).set({ leagueId: LEAGUE_ID, ...lock })
    await db.collection(COL.scorecardLocks).doc(lid(LEAGUE_ID, `lock-email-${emailLower}-week-${week}`)).set({ leagueId: LEAGUE_ID, ...lock })
  }

  // Finalize-week + side-games-ledger
  const base = getSiteBaseUrl(req)
  let finalizeResult = null, ledgerResult = null

  if (base) {
    try {
      const res = await fetch(`${base}/api/finalize-week?leagueId=${encodeURIComponent(LEAGUE_ID)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ week, force: true, submittedBy: ne(PLAYERS[0].email) })
      })
      const data = await res.json().catch(() => null)
      finalizeResult = { success: !!(data && data.success), finalized: (data && data.finalized) ? data.finalized.length : 0, missing: (data && data.missing) ? data.missing : [] }
    } catch (e) { finalizeResult = { success: false, error: String(e) } }

    try {
      const res = await fetch(`${base}/api/side-games-ledger?leagueId=${encodeURIComponent(LEAGUE_ID)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'compute', week })
      })
      const data = await res.json().catch(() => null)
      ledgerResult = { success: !!(data && data.success) }
    } catch (e) { ledgerResult = { success: false, error: String(e) } }
  }

  return Response.json({
    success: true, action: 'week', leagueId: LEAGUE_ID, week,
    seeded: { matchScorecards: totalMatchCards, scoreRecords: totalScoreRecords },
    finalize: finalizeResult, ledger: ledgerResult,
    next: week < 6 ? `Call POST /api/seed-kelleys-heroes with { action: "week", week: ${week + 1} }` : 'All 6 weeks seeded. Leaderboard is ready.'
  })
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const requiredKey = process.env.SEED_SAMPLE_KEY
  if (requiredKey) {
    const provided = req.headers.get('x-seed-key')
    if (!provided || provided !== requiredKey) return new Response('Unauthorized', { status: 401 })
  }

  const body   = await req.json().catch(() => ({}))
  const action = body && body.action ? String(body.action) : 'init'

  if (action === 'week') {
    const week = body && body.week ? parseInt(body.week, 10) : null
    if (!week || week < 1 || week > 6) return new Response('Invalid week — must be 1..6', { status: 400 })
    return await handleWeek(req, week)
  }

  const reset = body && body.reset !== undefined ? Boolean(body.reset) : true
  return await handleInit(reset)
}

export const config = { path: '/api/seed-kelleys-heroes' }
