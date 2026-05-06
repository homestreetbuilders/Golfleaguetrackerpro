import { db, COL, addDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const email = normalizeEmail(url.searchParams.get('email'))
    if (!email) return new Response('Missing email', { status: 400 })
    const limit = asInt(url.searchParams.get('limit')) || 50

    const snap = await db.collection(COL.handicapHistory)
      .where('leagueId', '==', leagueId)
      .where('email', '==', email)
      .get()
    const items = snap.docs.map(d => d.data())
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
      .slice(0, Math.max(1, Math.min(200, limit)))
    return Response.json({ history: items })
  }

  if (req.method === 'POST') {
    const body  = await req.json().catch(() => null)
    const email = normalizeEmail(body && body.email)
    if (!email) return new Response('Missing email', { status: 400 })
    const value = typeof body.value === 'number' ? body.value : (body.value ? parseFloat(body.value) : null)
    if (value === null || !Number.isFinite(value)) return new Response('Missing value', { status: 400 })

    const entry = {
      email, value,
      source: body.source ? String(body.source) : 'system',
      at:     new Date().toISOString(),
      week:   body.week || null,
      date:   body.date || null,
      note:   body.note ? String(body.note) : null
    }
    await addDoc(COL.handicapHistory, leagueId, entry)
    return Response.json({ success: true, entry })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/handicap-history' }
