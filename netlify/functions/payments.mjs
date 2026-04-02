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

function normalizeCategoryId(id) {
  return String(id || '').trim()
}

async function getSettings(leagueId) {
  const settingsStore = getStore(leagueStoreName('payment-settings', leagueId))
  const settings = await settingsStore.get('settings', { type: 'json' }).catch(() => null)
  const categories = Array.isArray(settings && settings.categories) ? settings.categories : []
  return { settings: settings || null, categories }
}

function computeSummaryForPlayer(player, categories, txns) {
  const active = categories.filter(c => c && c.active)
  const totals = {}
  for (const c of active) {
    totals[c.id] = { due: Number(c.amount) || 0, paid: 0 }
  }

  for (const t of txns) {
    if (!t || !t.categoryId) continue
    if (!totals[t.categoryId]) continue
    const amt = Number(t.amount)
    if (!Number.isFinite(amt)) continue
    totals[t.categoryId].paid += amt
  }

  const lines = active.map(c => {
    const due = totals[c.id].due
    const paid = totals[c.id].paid
    const bal = Math.max(0, due - paid)
    const status = paid >= due ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid'
    return { id: c.id, name: c.name, due, paid, balance: bal, status }
  })

  const dueTotal = lines.reduce((a, b) => a + (Number(b.due) || 0), 0)
  const paidTotal = lines.reduce((a, b) => a + (Number(b.paid) || 0), 0)
  const balanceTotal = Math.max(0, dueTotal - paidTotal)

  return {
    player: player.name,
    email: player.email,
    totals: { due: dueTotal, paid: paidTotal, balance: balanceTotal },
    categories: lines
  }
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('payments', leagueId))

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const email = normalizeEmail(body && body.email)
    const categoryId = normalizeCategoryId(body && body.categoryId)
    const amount = body && body.amount !== undefined ? Number(body.amount) : NaN
    const method = body && body.method ? String(body.method) : null
    const note = body && body.note ? String(body.note) : null
    const recordedBy = normalizeEmail(body && body.recordedBy)

    if (!email || !categoryId || !Number.isFinite(amount)) {
      return new Response('Missing email, categoryId, or amount', { status: 400 })
    }

    const key = `payment-${email}-${Date.now()}`
    const record = {
      email,
      categoryId,
      amount,
      method,
      note,
      recordedBy: recordedBy || null,
      createdAt: new Date().toISOString()
    }

    await store.setJSON(key, record)
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const email = normalizeEmail(url.searchParams.get('email'))
    const summary = url.searchParams.get('summary') === '1'
    const analytics = url.searchParams.get('analytics') === '1'
    const categoryIdFilter = normalizeCategoryId(url.searchParams.get('categoryId'))

    const { categories } = await getSettings(leagueId)
    const activeCategories = categories.filter(c => c && c.active)

    if (analytics) {
      if (!categoryIdFilter) {
        return new Response('Missing categoryId', { status: 400 })
      }

      const { blobs } = await store.list().catch(() => ({ blobs: [] }))
      const totals = {}
      for (const blob of blobs || []) {
        const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
        if (!data) continue
        if (normalizeCategoryId(data.categoryId) !== categoryIdFilter) continue
        const e = normalizeEmail(data.email)
        const amt = Number(data.amount)
        if (!e || !Number.isFinite(amt)) continue
        totals[e] = (totals[e] || 0) + amt
      }

      const playerStore = getStore(leagueStoreName('players', leagueId))
      const { blobs: playerBlobs } = await playerStore.list().catch(() => ({ blobs: [] }))
      const players = {}
      for (const blob of playerBlobs || []) {
        const p = await playerStore.get(blob.key, { type: 'json' }).catch(() => null)
        if (p && p.email) players[normalizeEmail(p.email)] = p.name || p.email
      }

      const ranking = Object.keys(totals).map(e => ({
        email: e,
        player: players[e] || e,
        totalPaid: totals[e]
      }))
        .sort((a, b) => (Number(b.totalPaid) || 0) - (Number(a.totalPaid) || 0))

      return Response.json({ categoryId: categoryIdFilter, ranking })
    }

    if (email) {
      const prefix = `payment-${email}-`
      const { blobs } = await store.list({ prefix }).catch(() => ({ blobs: [] }))
      const txns = []
      for (const blob of blobs || []) {
        const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
        if (data) txns.push(data)
      }
      txns.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

      if (!summary) {
        return Response.json({ categories: activeCategories, transactions: txns })
      }

      const playerStore = getStore(leagueStoreName('players', leagueId))
      const player = await playerStore.get(`player-${email}`, { type: 'json' }).catch(() => null)
      const p = {
        name: (player && player.name) || email,
        email
      }
      const s = computeSummaryForPlayer(p, categories, txns)
      return Response.json({ summary: s })
    }

    const playerStore = getStore(leagueStoreName('players', leagueId))
    const { blobs: playerBlobs } = await playerStore.list().catch(() => ({ blobs: [] }))
    const players = []
    for (const blob of playerBlobs || []) {
      const p = await playerStore.get(blob.key, { type: 'json' }).catch(() => null)
      if (p && p.email) {
        players.push({ name: p.name || p.email, email: normalizeEmail(p.email) })
      }
    }

    const summaries = []
    for (const p of players) {
      const prefix = `payment-${p.email}-`
      const { blobs } = await store.list({ prefix }).catch(() => ({ blobs: [] }))
      const txns = []
      for (const blob of blobs || []) {
        const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
        if (data) txns.push(data)
      }
      summaries.push(computeSummaryForPlayer(p, categories, txns))
    }

    summaries.sort((a, b) => String(a.player).localeCompare(String(b.player)))
    return Response.json({ categories: activeCategories, summaries })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/payments'
}
