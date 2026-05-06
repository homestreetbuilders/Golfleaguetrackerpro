import { requireAdmin } from './_auth.mjs'
import { db, COL, lid, listDocs, getDoc, addDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
function normalizeCategoryId(id) { return String(id || '').trim().toLowerCase() }

async function getSettings(leagueId) {
  const snap = await db.collection(COL.paymentSettings).doc(leagueId).get()
  const settings = snap.exists ? snap.data() : null
  const categories = Array.isArray(settings && settings.categories) ? settings.categories : []
  return { settings: settings || null, categories }
}

function computeSummaryForPlayer(player, categories, txns) {
  const active = categories.filter(c => c && c.active)
  const totals = {}
  for (const c of active) totals[c.id] = { due: Number(c.amount) || 0, paid: 0 }
  for (const t of txns) {
    if (!t || !t.categoryId || !totals[t.categoryId]) continue
    const amt = Number(t.amount)
    if (!Number.isFinite(amt)) continue
    totals[t.categoryId].paid += amt
  }
  const lines = active.map(c => {
    const due = totals[c.id].due; const paid = totals[c.id].paid; const bal = Math.max(0, due - paid)
    return { id: c.id, name: c.name, due, paid, balance: bal, status: paid >= due ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid' }
  })
  const dueTotal = lines.reduce((a, b) => a + (Number(b.due) || 0), 0)
  const paidTotal = lines.reduce((a, b) => a + (Number(b.paid) || 0), 0)
  return { player: player.name, email: player.email, totals: { due: dueTotal, paid: paidTotal, balance: Math.max(0, dueTotal - paidTotal) }, categories: lines }
}

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))

  if (req.method === 'POST') {
    const authErr = await requireAdmin(req)
    if (authErr) return authErr
    const body       = await req.json().catch(() => null)
    const email      = normalizeEmail(body && body.email)
    const categoryId = normalizeCategoryId(body && body.categoryId)
    const amount     = body && body.amount !== undefined ? Number(body.amount) : NaN
    if (!email || !categoryId || !Number.isFinite(amount)) return new Response('Missing email, categoryId, or amount', { status: 400 })

    const record = {
      email, categoryId, amount,
      method:     body.method ? String(body.method) : null,
      note:       body.note   ? String(body.note)   : null,
      recordedBy: normalizeEmail(body && body.recordedBy) || null,
      createdAt: new Date().toISOString()
    }
    await addDoc(COL.payments, leagueId, record)
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const email           = normalizeEmail(url.searchParams.get('email'))
    const summary         = url.searchParams.get('summary') === '1'
    const analytics       = url.searchParams.get('analytics') === '1'
    const categoryIdFilter = normalizeCategoryId(url.searchParams.get('categoryId'))

    const { categories } = await getSettings(leagueId)
    const activeCategories = categories.filter(c => c && c.active)

    if (analytics) {
      if (!categoryIdFilter) return new Response('Missing categoryId', { status: 400 })
      const snap = await db.collection(COL.payments).where('leagueId', '==', leagueId).get()
      const totals = {}
      for (const doc of snap.docs) {
        const data = doc.data()
        if (normalizeCategoryId(data.categoryId) !== categoryIdFilter) continue
        const e = normalizeEmail(data.email); const amt = Number(data.amount)
        if (!e || !Number.isFinite(amt)) continue
        totals[e] = (totals[e] || 0) + amt
      }
      const playerDocs = await listDocs(COL.players, leagueId)
      const players = {}
      for (const p of playerDocs) { if (p && p.email) players[normalizeEmail(p.email)] = p.name || p.email }
      const ranking = Object.keys(totals).map(e => ({ email: e, player: players[e] || e, totalPaid: totals[e] }))
        .sort((a, b) => (Number(b.totalPaid) || 0) - (Number(a.totalPaid) || 0))
      return Response.json({ categoryId: categoryIdFilter, ranking })
    }

    if (email) {
      const snap = await db.collection(COL.payments).where('leagueId', '==', leagueId).where('email', '==', email).get()
      const txns = snap.docs.map(d => d.data()).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      if (!summary) return Response.json({ categories: activeCategories, transactions: txns })

      const playerSnap = await db.collection(COL.players).doc(lid(leagueId, email)).get()
      const player = playerSnap.exists ? playerSnap.data() : null
      const p = { name: (player && player.name) || email, email }
      return Response.json({ summary: computeSummaryForPlayer(p, categories, txns) })
    }

    const playerDocs = await listDocs(COL.players, leagueId)
    const txnSnap = await db.collection(COL.payments).where('leagueId', '==', leagueId).get()
    const txnsByEmail = {}
    for (const doc of txnSnap.docs) {
      const d = doc.data(); const e = normalizeEmail(d.email)
      if (!txnsByEmail[e]) txnsByEmail[e] = []
      txnsByEmail[e].push(d)
    }
    const summaries = playerDocs
      .filter(p => p && p.email)
      .map(p => computeSummaryForPlayer({ name: p.name || p.email, email: normalizeEmail(p.email) }, categories, txnsByEmail[normalizeEmail(p.email)] || []))
    summaries.sort((a, b) => String(a.player).localeCompare(String(b.player)))
    return Response.json({ categories: activeCategories, summaries })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/payments' }
