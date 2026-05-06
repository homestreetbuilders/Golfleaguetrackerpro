import { db, COL } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }

const DEFAULT_SETTINGS = {
  categories: [
    { id: 'greens_fees', name: 'Greens Fees', active: true,  amount: 0   },
    { id: 'league_dues', name: 'League Dues', active: true,  amount: 120 },
    { id: 'fifty_fifty', name: '50/50',       active: false, amount: 5   },
    { id: 'skins',       name: 'Skins',       active: false, amount: 5   },
    { id: 'gross_skins', name: 'Gross Skins', active: false, amount: 5   }
  ],
  updatedAt: null
}

function sanitizeCategory(cat) {
  const id   = String(cat && cat.id   || '').trim()
  const name = String(cat && cat.name || '').trim()
  const active = !!(cat && cat.active)
  const amountRaw = cat && cat.amount !== undefined ? Number(cat.amount) : 0
  const amount = Number.isFinite(amountRaw) ? Math.max(0, amountRaw) : 0
  if (!id || !name) return null
  return { id, name, active, amount }
}

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const snap = await db.collection(COL.paymentSettings).doc(leagueId).get()
    return Response.json({ settings: snap.exists ? snap.data() : DEFAULT_SETTINGS })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const cats = Array.isArray(body && body.categories) ? body.categories : null
    if (!cats) return new Response('Missing categories', { status: 400 })
    const cleaned = cats.map(sanitizeCategory).filter(Boolean)
    if (!cleaned.length) return new Response('No valid categories', { status: 400 })
    const settings = { categories: cleaned, leagueId, updatedAt: new Date().toISOString() }
    await db.collection(COL.paymentSettings).doc(leagueId).set(settings)
    return Response.json({ success: true, settings })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/payment-settings' }
