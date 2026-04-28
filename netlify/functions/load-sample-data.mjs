/**
 * load-sample-data.mjs
 * POST /api/load-sample-data
 *
 * Seeds a fully-populated sample league that exercises every major feature:
 *   - 8 players, 4 teams
 *   - Mud Run Golf Club (pars/hcp-indexes matching the app defaults)
 *   - 10-week schedule with sides assigned
 *   - League settings: netSkins / grossSkins / 50-50 season pots
 *   - Handicap formula (best-8 of last-20, ×0.96)
 *   - Side-game opt-ins for every player
 *   - Pairings for weeks 1–3
 *   - Week 1 & 2: final match scorecards → individual score records + locks
 *   - Week 3: draft match scorecards (no score records yet)
 *   - Payment categories + sample payment records
 *   - 3 chat messages
 *
 * Body (JSON): { reset: true }   — clears existing data before seeding (default true)
 *
 * Optional env var: SEED_SAMPLE_KEY — if set, callers must send it as x-seed-key header.
 */

import { getStore } from '@netlify/blobs'

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function leagueStoreName(base, leagueId) {
  const id = normalizeLeagueId(leagueId)
  return id ? `${base}-${id}` : base
}

function ne(email) {
  return String(email || '').trim().toLowerCase()
}

function isoDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

async function clearStore(store) {
  const { blobs } = await store.list().catch(() => ({ blobs: [] }))
  for (const b of blobs || []) {
    if (b && b.key) await store.delete(b.key).catch(() => null)
  }
}

// ─── fixed course data (matches app PARS / HOLE_HCP_INDEX constants) ────────

// Front-9 par:  [4,3,5,4,3,4,4,3,4] = 34
// Front-9 hcp:  [5,9,1,7,3,8,2,6,4]
// Back-9  par:  [4,5,3,4,5,3,4,4,4] = 36
// Back-9  hcp:  [10,2,16,6,14,18,4,12,8]

const FRONT_PARS  = [4, 3, 5, 4, 3, 4, 4, 3, 4]
const FRONT_HCP   = [5, 9, 1, 7, 3, 8, 2, 6, 4]
const BACK_PARS   = [4, 5, 3, 4, 5, 3, 4, 4, 4]
const BACK_HCP    = [10, 2, 16, 6, 14, 18, 4, 12, 8]

const FRONT_PAR_TOTAL = FRONT_PARS.reduce((a, b) => a + b, 0)  // 34
const BACK_PAR_TOTAL  = BACK_PARS.reduce((a, b) => a + b, 0)   // 36

const COURSE_NAME = 'Mud Run Golf Club'
const COURSE_ID   = 'mud-run-gc'

function buildCourse() {
  const holes = []
  for (let i = 0; i < 9; i++) {
    holes.push({ hole: i + 1, par: FRONT_PARS[i], hcpIndex: FRONT_HCP[i] })
  }
  for (let i = 0; i < 9; i++) {
    holes.push({ hole: i + 10, par: BACK_PARS[i], hcpIndex: BACK_HCP[i] })
  }
  return {
    id: COURSE_ID,
    name: COURSE_NAME,
    address: '100 Mud Run Rd, Canal Winchester, OH 43110',
    lat: 39.851,
    lon: -82.799,
    holes,
    tees: [
      { name: 'White', yards: [310,145,485,355,175,360,320,130,380,355,510,145,360,475,155,380,335,370] },
      { name: 'Blue',  yards: [335,160,510,375,195,385,345,150,405,380,535,165,385,500,175,405,360,395] },
      { name: 'Red',   yards: [285,120,450,325,140,330,290,105,345,320,465,120,325,440,125,345,295,330] }
    ],
    updatedAt: new Date().toISOString()
  }
}

// ─── player/team roster ───────────────────────────────────────────────────────

const PLAYERS = [
  { name: 'Alex Rivers',   email: 'alex@example.com',    phone: '330-555-0101', handicap: 8.2,  team: 1, role: 'admin'  },
  { name: 'Brooke Taylor', email: 'brooke@example.com',  phone: '330-555-0102', handicap: 12.4, team: 1, role: 'scorer' },
  { name: 'Casey Jordan',  email: 'casey@example.com',   phone: '330-555-0103', handicap: 17.1, team: 2, role: 'player' },
  { name: 'Devon Lee',     email: 'devon@example.com',   phone: '330-555-0104', handicap: 6.8,  team: 2, role: 'player' },
  { name: 'Emerson Cruz',  email: 'emerson@example.com', phone: '330-555-0105', handicap: 22.0, team: 3, role: 'player' },
  { name: 'Finley Park',   email: 'finley@example.com',  phone: '330-555-0106', handicap: 14.7, team: 3, role: 'player' },
  { name: 'Gray Morgan',   email: 'gray@example.com',    phone: '330-555-0107', handicap: 10.9, team: 4, role: 'player' },
  { name: 'Harper Quinn',  email: 'harper@example.com',  phone: '330-555-0108', handicap: 19.6, team: 4, role: 'player' }
]

// ─── realistic per-player hole scores (front 9 × 3 weeks) ────────────────────
// Par totals: week1-front=34, week2-front=34, week3-front=34

const HOLE_SCORES = {
  // [name]: [[wk1 holes], [wk2 holes], [wk3 holes]]
  'Alex Rivers':   [[4,3,5,4,4,4,5,3,5], [4,3,6,4,3,4,4,3,5], [4,3,5,4,3,5,4,3,4]],  // 37,36,35
  'Brooke Taylor': [[5,4,6,4,3,5,4,4,5], [5,4,5,5,3,4,5,4,5], [5,3,6,5,3,5,5,3,5]],  // 40,40,40
  'Casey Jordan':  [[5,4,6,5,4,5,5,4,6], [6,4,6,5,4,5,5,4,5], [6,4,7,5,4,5,5,3,6]],  // 44,44,45
  'Devon Lee':     [[4,3,5,4,3,4,4,3,4], [4,3,5,4,3,5,4,3,4], [4,3,5,4,3,4,4,3,5]],  // 34,35,35
  'Emerson Cruz':  [[6,4,7,5,4,6,5,4,6], [6,5,7,5,4,6,6,4,7], [7,5,7,6,4,6,5,5,7]],  // 47,50,52
  'Finley Park':   [[5,4,6,5,3,5,4,4,5], [5,3,6,4,4,5,5,3,5], [5,4,6,5,3,5,5,4,5]],  // 41,40,42
  'Gray Morgan':   [[4,3,5,4,3,5,4,3,5], [5,3,5,4,3,5,4,3,5], [4,3,5,4,4,5,4,3,5]],  // 36,37,37
  'Harper Quinn':  [[5,4,6,5,4,5,5,4,6], [6,4,6,5,3,5,5,4,6], [6,4,7,5,4,5,5,4,6]]   // 44,44,46
}

// ─── matchup schedule ─────────────────────────────────────────────────────────
// week → [ {teamA, teamB}, ... ]

const MATCHUPS = {
  1: [{ teamA: 1, teamB: 2 }, { teamA: 3, teamB: 4 }],
  2: [{ teamA: 1, teamB: 3 }, { teamA: 2, teamB: 4 }],
  3: [{ teamA: 1, teamB: 4 }, { teamA: 2, teamB: 3 }],
  4: [{ teamA: 1, teamB: 2 }, { teamA: 3, teamB: 4 }],
  5: [{ teamA: 1, teamB: 3 }, { teamA: 2, teamB: 4 }]
}

// ─── main handler ─────────────────────────────────────────────────────────────

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const requiredKey = process.env.SEED_SAMPLE_KEY
  if (requiredKey) {
    const provided = req.headers.get('x-seed-key')
    if (!provided || provided !== requiredKey) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const reset = body && body.reset !== undefined ? Boolean(body.reset) : true
  const leagueId = (body && body.leagueId) ? String(body.leagueId).trim() : 'sample-league'
  const leagueName = 'Sample League'

  const now = new Date().toISOString()

  // ── stores ──────────────────────────────────────────────────────────────────
  const leaguesStore       = getStore('leagues')
  const playersStore       = getStore(leagueStoreName('players',          leagueId))
  const rolesStore         = getStore(leagueStoreName('user-roles',       leagueId))
  const coursesStore       = getStore(leagueStoreName('courses',          leagueId))
  const scheduleStore      = getStore(leagueStoreName('schedule',         leagueId))
  const teamsStore         = getStore(leagueStoreName('teams',            leagueId))
  const pairingsStore      = getStore(leagueStoreName('pairings',         leagueId))
  const scoresStore        = getStore(leagueStoreName('scores',           leagueId))
  const locksStore         = getStore(leagueStoreName('scorecard-locks',  leagueId))
  const matchScoreStore    = getStore(leagueStoreName('match-scorecards', leagueId))
  const optinsStore        = getStore(leagueStoreName('side-game-optins', leagueId))
  const ledgerStore        = getStore(leagueStoreName('side-games-ledger',leagueId))
  const leagueSettStore    = getStore(leagueStoreName('league-settings',  leagueId))
  const hcpConfigStore     = getStore(leagueStoreName('handicap-config',  leagueId))
  const paymentsStore      = getStore(leagueStoreName('payments',         leagueId))
  const paySettStore       = getStore(leagueStoreName('payment-settings', leagueId))
  const chatStore          = getStore(leagueStoreName('chat',             leagueId))

  // ── optional reset ───────────────────────────────────────────────────────────
  if (reset) {
    await Promise.all([
      clearStore(playersStore),
      clearStore(rolesStore),
      clearStore(coursesStore),
      clearStore(scheduleStore),
      clearStore(teamsStore),
      clearStore(pairingsStore),
      clearStore(scoresStore),
      clearStore(locksStore),
      clearStore(matchScoreStore),
      clearStore(optinsStore),
      clearStore(ledgerStore),
      clearStore(paymentsStore),
      clearStore(chatStore)
    ])
  }

  // ── global league record ─────────────────────────────────────────────────────
  await leaguesStore.setJSON(`league-${leagueId}`, {
    id: leagueId, name: leagueName, createdAt: now
  })

  // ── league settings ──────────────────────────────────────────────────────────
  await leagueSettStore.setJSON('settings', {
    leagueName,
    seasonStart: isoDate(0),
    seasonEnd:   isoDate(70),          // 10-week season
    teePlacementsCount: 3,
    handicapMode: 'custom',
    customFormulaText: 'Best 4 of last 8 rounds × 0.96, max 36',
    netSkinsSeasonPot:    160,         // $20/week × 8 match weeks
    grossSkinsSeasonPot:  160,
    fiftyFiftySeasonBuyIn: 10,        // $10/player for the season
    updatedAt: now
  })

  // scoring mode: batch (scores are finalized end-of-round, not live)
  await leagueSettStore.set('scoring-mode', 'batch')

  // ── handicap formula ─────────────────────────────────────────────────────────
  await hcpConfigStore.setJSON('formula', {
    bestN: 4, lastN: 8, multiplier: 0.96, maxHcp: 36, minRounds: 2, bonus: 'none',
    updatedAt: now
  })

  // ── course ───────────────────────────────────────────────────────────────────
  const course = buildCourse()
  await coursesStore.setJSON(`course-${COURSE_ID}`, course)

  // ── players + roles ───────────────────────────────────────────────────────────
  for (const p of PLAYERS) {
    const email = ne(p.email)
    await playersStore.setJSON(`player-${email}`, {
      name: p.name, email, phone: p.phone,
      handicap: p.handicap, createdAt: now, updatedAt: now
    })
    await rolesStore.set(`role-${email}`, p.role)
  }

  // ── teams (4 teams of 2) ──────────────────────────────────────────────────────
  const teamMap = new Map()  // teamNumber → {player1Email, player2Email, players[]}
  for (let t = 1; t <= 4; t++) {
    const members = PLAYERS.filter(p => p.team === t)
    const p1 = ne(members[0].email)
    const p2 = ne(members[1].email)
    await teamsStore.setJSON(`team-${t}`, {
      teamNumber: t, player1Email: p1, player2Email: p2, updatedAt: now
    })
    teamMap.set(t, { player1Email: p1, player2Email: p2, players: members })
  }

  // ── schedule (10 weeks) ───────────────────────────────────────────────────────
  const scheduleWeeks = []
  for (let w = 1; w <= 10; w++) {
    const isScramble = w === 10
    const side = w <= 5 ? 'front' : 'back'   // front nine first half, back nine second half
    const weekRec = {
      week: w,
      date:    isoDate((w - 1) * 7),
      title:   isScramble ? `Week ${w} — Scramble` : `Week ${w} — Match Play`,
      course:  COURSE_NAME,
      teeTime: '5:30 PM',
      type:    isScramble ? 'scramble' : 'match',
      side,
      updatedAt: now
    }
    await scheduleStore.setJSON(`week-${w}`, weekRec)
    scheduleWeeks.push(weekRec)
  }

  // ── pairings (weeks 1–3) ──────────────────────────────────────────────────────
  for (let w = 1; w <= 3; w++) {
    const matchups = MATCHUPS[w] || []
    // Each matchup becomes one group of 4 players
    const groups = matchups.map((m, gi) => {
      const t1 = teamMap.get(m.teamA)
      const t2 = teamMap.get(m.teamB)
      const players = [
        ...PLAYERS.filter(p => ne(p.email) === t1.player1Email || ne(p.email) === t1.player2Email),
        ...PLAYERS.filter(p => ne(p.email) === t2.player1Email || ne(p.email) === t2.player2Email)
      ].map(p => ({ name: p.name, email: ne(p.email) }))
      return { id: `w${w}-g${gi + 1}`, players }
    })
    await pairingsStore.setJSON(`week-${w}`, {
      week: w, groups, updatedAt: now, updatedBy: ne(PLAYERS[0].email), mode: 'manual'
    })
  }

  // ── side-game opt-ins (all 8 players, all 3 games, joined week 1) ─────────────
  for (const p of PLAYERS) {
    const email = ne(p.email)
    await optinsStore.setJSON(`optin-${email}`, {
      email,
      netSkins:   { enabled: true, joinedWeek: 1 },
      grossSkins: { enabled: true, joinedWeek: 1 },
      fiftyFifty: { enabled: true, joinedWeek: 1 },
      updatedAt: now
    })
  }

  // ── match scorecards + individual scores + locks (weeks 1–2 final, 3 draft) ────
  //
  // Per fix #1 all final match scorecards must also have individual score records
  // in the scores store so leaderboard, analytics, finalize-week, and side-games
  // can process them. We replicate exactly what match-scorecards.mjs does.

  let totalMatchCards = 0
  let totalScoreRecords = 0

  for (let w = 1; w <= 3; w++) {
    const matchups = MATCHUPS[w] || []
    const status = w <= 2 ? 'final' : 'draft'
    const side = w <= 5 ? 'front' : 'back'
    const parTotal = side === 'back' ? BACK_PAR_TOTAL : FRONT_PAR_TOTAL
    const date = isoDate((w - 1) * 7)
    const submittedAt = new Date((Date.now() - (3 - w) * 7 * 86400000)).toISOString()

    for (const { teamA, teamB } of matchups) {
      const t1 = teamMap.get(teamA)
      const t2 = teamMap.get(teamB)
      const allEmails = [t1.player1Email, t1.player2Email, t2.player1Email, t2.player2Email]

      const playerPayloads = allEmails.map(email => {
        const pd = PLAYERS.find(p => ne(p.email) === email)
        const weekIdx = w - 1
        const holesArr = HOLE_SCORES[pd.name][weekIdx]
        const grossTotal = holesArr.reduce((a, b) => a + b, 0)
        return {
          email,
          name: pd.name,
          holes: holesArr,
          grossTotal,
          handicapSnapshot: pd.handicap
        }
      })

      const a = Math.min(teamA, teamB)
      const b = Math.max(teamA, teamB)
      const matchKey = `week-${w}-match-${a}-vs-${b}`

      // 1) Write match scorecard record
      await matchScoreStore.setJSON(matchKey, {
        key: matchKey,
        week: w,
        teamA,
        teamB,
        date,
        course: COURSE_NAME,
        tee: 'White',
        side,
        players: playerPayloads,
        parTotal,
        status,
        submittedBy: ne(PLAYERS[0].email),
        submittedAt
      })
      totalMatchCards++

      if (status === 'final') {
        // 2) Per fix #1: mirror each player's score into the scores store
        //    so leaderboard / analytics / handicap / side-games all work
        for (const pp of playerPayloads) {
          const nameLower = String(pp.name).toLowerCase()
          const emailLower = ne(pp.email)
          // Deterministic key (same as match-scorecards.mjs) prevents duplicates on re-seed
          const scoreKey = `week-${w}-${nameLower}-match`
          await scoresStore.setJSON(scoreKey, {
            player:            pp.name,
            playerEmail:       emailLower,       // fix #2
            week:              w,
            date,
            course:            COURSE_NAME,
            tee:               'White',
            side,
            holes:             pp.holes,
            grossTotal:        pp.grossTotal,
            handicapSnapshot:  pp.handicapSnapshot,   // fix #9
            parTotal,                                  // fix #6
            stats:             null,
            status:            'final',
            submittedBy:       ne(PLAYERS[0].email),
            submittedAt,
            fromMatchScorecard: matchKey
          })
          totalScoreRecords++

          // 3) Per fix #7: write both name-based and email-based lock keys
          const lockData = { locked: true, lockedAt: submittedAt, reason: 'match_scorecard' }
          await locksStore.setJSON(`lock-${nameLower}-week-${w}`, lockData)
          await locksStore.setJSON(`lock-email-${emailLower}-week-${w}`, lockData)
        }
      }
    }
  }

  // ── payment settings ──────────────────────────────────────────────────────────
  const payCategories = [
    { id: 'league_dues',  name: 'League Dues',  amount: 120, active: true },
    { id: 'net_skins',   name: 'Net Skins',    amount: 20,  active: true },
    { id: 'gross_skins', name: 'Gross Skins',  amount: 20,  active: true },
    { id: 'fifty_fifty', name: '50/50',         amount: 10,  active: true },
    { id: 'events',      name: 'Events',        amount: 30,  active: true }
  ]
  await paySettStore.setJSON('settings', { categories: payCategories, updatedAt: now })

  // ── sample payment records ────────────────────────────────────────────────────
  const payments = [
    { email: 'alex@example.com',    categoryId: 'league_dues',  amount: 120, method: 'venmo',  note: 'Paid in full' },
    { email: 'brooke@example.com',  categoryId: 'league_dues',  amount: 120, method: 'venmo',  note: 'Paid in full' },
    { email: 'casey@example.com',   categoryId: 'league_dues',  amount: 60,  method: 'cash',   note: 'Half payment' },
    { email: 'devon@example.com',   categoryId: 'league_dues',  amount: 120, method: 'check',  note: '' },
    { email: 'emerson@example.com', categoryId: 'league_dues',  amount: 120, method: 'venmo',  note: '' },
    { email: 'alex@example.com',    categoryId: 'net_skins',    amount: 20,  method: 'venmo',  note: '' },
    { email: 'brooke@example.com',  categoryId: 'net_skins',    amount: 20,  method: 'venmo',  note: '' },
    { email: 'casey@example.com',   categoryId: 'fifty_fifty',  amount: 10,  method: 'cash',   note: '' },
    { email: 'devon@example.com',   categoryId: 'fifty_fifty',  amount: 10,  method: 'cash',   note: '' },
    { email: 'finley@example.com',  categoryId: 'league_dues',  amount: 120, method: 'venmo',  note: '' },
    { email: 'gray@example.com',    categoryId: 'gross_skins',  amount: 20,  method: 'venmo',  note: '' },
    { email: 'harper@example.com',  categoryId: 'league_dues',  amount: 0,   method: '',       note: 'Pending' }
  ]
  for (const t of payments) {
    if (!t.amount) continue   // skip $0 records
    const k = `payment-${ne(t.email)}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    await paymentsStore.setJSON(k, {
      email: ne(t.email), categoryId: t.categoryId, amount: t.amount,
      method: t.method, note: t.note,
      recordedBy: ne(PLAYERS[0].email), createdAt: now
    })
  }

  // ── chat messages ─────────────────────────────────────────────────────────────
  const msgs = [
    { user: 'Alex Rivers',   email: 'alex@example.com',   msg: 'Welcome to Sample League! This data was seeded by load-sample-data. Explore every feature.' },
    { user: 'Devon Lee',     email: 'devon@example.com',  msg: 'Shot even par week 1 🎯 Leaderboard and net skins should both pick that up.' },
    { user: 'Brooke Taylor', email: 'brooke@example.com', msg: 'Reminder: submit your draft scorecard from week 3 when ready.' }
  ]
  for (const m of msgs) {
    const k = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
    await chatStore.setJSON(k, {
      id: k, user: m.user, email: ne(m.email), msg: m.msg, createdAt: now
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return Response.json({
    success: true,
    leagueId,
    seeded: {
      players:        PLAYERS.length,
      teams:          4,
      course:         COURSE_NAME,
      scheduleWeeks:  10,
      pairings:       3,
      sideGameOptIns: PLAYERS.length,
      matchScorecards: totalMatchCards,
      scoreRecords:   totalScoreRecords,       // mirrored into scores store (fix #1)
      payments:       payments.filter(p => p.amount > 0).length,
      chatMessages:   msgs.length
    },
    notes: [
      'Weeks 1-2: final match scorecards + individual score records in scores store',
      'Week 3: draft match scorecards (no score records yet — submit to finalize)',
      'All 8 players opted into netSkins, grossSkins, and fiftyFifty from week 1',
      'Run POST /api/finalize-week to recalculate handicaps and trigger side-games ledger',
      'parTotal stored on every score record (fix #6: no more hardcoded par-36)',
      'playerEmail stored on every score record (fix #2: side-games eligibility works)'
    ]
  })
}

export const config = {
  path: '/api/load-sample-data'
}
