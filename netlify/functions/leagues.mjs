import { db, COL } from './_firebase.mjs'

function normalizeId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }

export default async (req) => {
  if (req.method === 'GET') {
    const snap = await db.collection(COL.leagues).get()
    const leagues = snap.docs.map(d => d.data()).filter(l => l && l.id)
    leagues.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    return Response.json({ leagues })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const name = body && body.name ? String(body.name).trim() : ''
    if (!name) return new Response('Missing name', { status: 400 })
    const id = normalizeId(body && body.id ? body.id : name)
    if (!id) return new Response('Invalid id', { status: 400 })
    const record = { id, name, createdAt: new Date().toISOString() }
    await db.collection(COL.leagues).doc(id).set(record)
    return Response.json({ success: true, league: record })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/leagues' }
