import { getStore } from '@netlify/blobs'

function normalizeId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function normalizeLeagueId(v) {
  return normalizeId(v)
}

function leagueStoreName(base, leagueId) {
  const id = normalizeLeagueId(leagueId)
  return id ? `${base}-${id}` : base
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

async function clearStore(store, prefix) {
  const opts = prefix ? { prefix } : {}
  const { blobs } = await store.list(opts).catch(() => ({ blobs: [] }))
  for (const b of blobs || []) {
    if (!b || !b.key) continue
    await store.delete(b.key).catch(() => null)
  }
}

function isoTodayPlus(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Optional protection: if SEED_SAMPLE_KEY is set, require it.
  const requiredKey = process.env.SEED_SAMPLE_KEY
  if (requiredKey) {
    const provided = req.headers.get('x-seed-key')
    if (!provided || String(provided) !== String(requiredKey)) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const reset = body && body.reset !== undefined ? Boolean(body.reset) : true

  const leagueName = 'Sample League'
  const leagueId = 'sample-league'

  // Ensure league exists in global leagues store
  const leaguesStore = getStore('leagues')
  const leagueRecord = {
    id: leagueId,
    name: leagueName,
    createdAt: new Date().toISOString()
  }
  await leaguesStore.setJSON(`league-${leagueId}`, leagueRecord)

  // League-scoped stores
  const playersStore = getStore(leagueStoreName('players', leagueId))
  const rolesStore = getStore(leagueStoreName('user-roles', leagueId))
  const coursesStore = getStore(leagueStoreName('courses', leagueId))
  const scheduleStore = getStore(leagueStoreName('schedule', leagueId))
  const scoresStore = getStore(leagueStoreName('scores', leagueId))
  const locksStore = getStore(leagueStoreName('scorecard-locks', leagueId))
  const paymentsStore = getStore(leagueStoreName('payments', leagueId))
  const paymentSettingsStore = getStore(leagueStoreName('payment-settings', leagueId))
  const chatStore = getStore(leagueStoreName('chat', leagueId))

  if (reset) {
    await clearStore(playersStore)
    await clearStore(rolesStore)
    await clearStore(coursesStore)
    await clearStore(scheduleStore)
    await clearStore(scoresStore)
    await clearStore(locksStore)
    await clearStore(paymentsStore)
    await clearStore(paymentSettingsStore)
    await clearStore(chatStore)
  }

  // Seed players
  const players = [
    { name: 'Alex Rivers', email: 'alex@example.com', phone: '555-0101', handicap: 8.2, role: 'admin' },
    { name: 'Brooke Taylor', email: 'brooke@example.com', phone: '555-0102', handicap: 12.4, role: 'scorer' },
    { name: 'Casey Jordan', email: 'casey@example.com', phone: '555-0103', handicap: 17.1, role: 'player' },
    { name: 'Devon Lee', email: 'devon@example.com', phone: '555-0104', handicap: 6.8, role: 'player' },
    { name: 'Emerson Cruz', email: 'emerson@example.com', phone: '555-0105', handicap: 22.0, role: 'player' },
    { name: 'Finley Park', email: 'finley@example.com', phone: '555-0106', handicap: 14.7, role: 'player' },
    { name: 'Gray Morgan', email: 'gray@example.com', phone: '555-0107', handicap: 10.9, role: 'player' },
    { name: 'Harper Quinn', email: 'harper@example.com', phone: '555-0108', handicap: 19.6, role: 'player' }
  ]

  for (const p of players) {
    const email = normalizeEmail(p.email)
    await playersStore.setJSON(`player-${email}`, {
      name: p.name,
      email,
      phone: p.phone,
      handicap: p.handicap,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    await rolesStore.set(`role-${email}`, p.role)
  }

  // Seed courses
  const holes = Array.from({ length: 18 }).map((_, i) => ({
    hole: i + 1,
    par: i % 3 === 0 ? 5 : (i % 3 === 1 ? 4 : 3),
    hcpIndex: i + 1
  }))

  const course = {
    id: 'sample-gc',
    name: 'Sample Golf Club',
    address: '123 Fairway Dr, Columbus, OH',
    lat: 39.9612,
    lon: -82.9988,
    tees: [
      { name: 'White', yards: Array.from({ length: 18 }).map((_, i) => 330 + i * 5) },
      { name: 'Blue', yards: Array.from({ length: 18 }).map((_, i) => 360 + i * 6) },
      { name: 'Red', yards: Array.from({ length: 18 }).map((_, i) => 300 + i * 4) }
    ],
    holes,
    updatedAt: new Date().toISOString()
  }
  await coursesStore.setJSON('course-sample-gc', course)

  // Seed schedule weeks
  for (let w = 1; w <= 10; w++) {
    await scheduleStore.setJSON(`week-${w}`, {
      week: w,
      date: isoTodayPlus((w - 1) * 7),
      title: `Week ${w} — Regular Match`,
      course: course.name,
      teeTime: '5:30 PM',
      type: 'match',
      updatedAt: new Date().toISOString()
    })
  }

  // Payment settings + a few payments
  const categories = [
    { id: 'dues', name: 'League Dues', amount: 100, active: true },
    { id: 'skins', name: 'Skins', amount: 20, active: true },
    { id: 'events', name: 'Events', amount: 30, active: true }
  ]
  await paymentSettingsStore.setJSON('settings', {
    categories,
    updatedAt: new Date().toISOString()
  })

  const samplePayments = [
    { email: 'casey@example.com', categoryId: 'dues', amount: 50, method: 'cash', note: 'Half paid', recordedBy: 'alex@example.com' },
    { email: 'devon@example.com', categoryId: 'dues', amount: 100, method: 'venmo', note: 'Paid in full', recordedBy: 'brooke@example.com' },
    { email: 'harper@example.com', categoryId: 'skins', amount: 20, method: 'cash', note: '', recordedBy: 'brooke@example.com' }
  ]
  for (const t of samplePayments) {
    const email = normalizeEmail(t.email)
    const key = `payment-${email}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    await paymentsStore.setJSON(key, {
      email,
      categoryId: t.categoryId,
      amount: t.amount,
      method: t.method,
      note: t.note,
      recordedBy: normalizeEmail(t.recordedBy),
      createdAt: new Date().toISOString()
    })
  }

  // Chat
  const msgs = [
    { user: 'Alex Rivers', email: 'alex@example.com', msg: 'Welcome to the Sample League! Use this league to test features.' },
    { user: 'Brooke Taylor', email: 'brooke@example.com', msg: 'Reminder: enter scores after your round. Drafts are OK.' },
    { user: 'Casey Jordan', email: 'casey@example.com', msg: 'Testing chat works great.' }
  ]
  for (const m of msgs) {
    const key = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
    await chatStore.setJSON(key, {
      id: key,
      user: m.user,
      email: normalizeEmail(m.email),
      msg: m.msg,
      createdAt: new Date().toISOString()
    })
  }

  // A couple sample scores
  const scoreTemplates = [
    { player: 'Casey Jordan', holes: [5, 5, 4, 6, 4, 5, 4, 5, 6], shots: [2, 2, 1, 2, 1, 2, 1, 2, 2] },
    { player: 'Devon Lee', holes: [4, 4, 3, 5, 4, 4, 3, 4, 5], shots: [1, 2, 1, 2, 1, 2, 1, 2, 2] }
  ]
  for (let i = 0; i < scoreTemplates.length; i++) {
    const s = scoreTemplates[i]
    const week = 1
    const key = `week-${week}-${String(s.player).toLowerCase()}-${Date.now()}-${i}`
    await scoresStore.setJSON(key, {
      player: s.player,
      playerEmail: null,
      week,
      date: isoTodayPlus(0),
      course: course.name,
      tee: 'White',
      side: 'front',
      holes: s.holes,
      shots: s.shots,
      grossTotal: s.holes.reduce((a, b) => a + b, 0),
      handicapSnapshot: null,
      stats: null,
      status: 'final',
      submittedBy: 'alex@example.com',
      submittedAt: new Date().toISOString()
    })
  }

  return Response.json({
    success: true,
    league: leagueRecord,
    seeded: {
      players: players.length,
      courses: 1,
      scheduleWeeks: 10,
      payments: samplePayments.length,
      chatMessages: msgs.length,
      scores: scoreTemplates.length
    }
  })
}

export const config = {
  path: '/api/seed-sample-league'
}
