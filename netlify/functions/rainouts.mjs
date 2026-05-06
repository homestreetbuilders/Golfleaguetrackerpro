import { db, COL } from './_firebase.mjs'

function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }

export default async (req) => {
  // Global rainouts store (not league-scoped) — doc IDs: rainout-week-{N}
  const col = db.collection(COL.rainouts)

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const week = asInt(body && body.week)
    if (!week) return new Response('Missing week', { status: 400 })
    const key = `rainout-week-${week}`
    await col.doc(key).set({
      week,
      originalDate: body.originalDate || null,
      reason: body.reason || null,
      rescheduledDate: body.rescheduledDate || null,
      status: body.status || 'pending',
      markedAt: new Date().toISOString()
    })
    return Response.json({ success: true })
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const week = asInt(url.searchParams.get('week'))
    if (!week) return new Response('Missing week', { status: 400 })
    await col.doc(`rainout-week-${week}`).delete().catch(() => null)
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const snap = await col.get()
    const rainouts = snap.docs
      .map(d => d.data())
      .filter(d => d.week)
      .sort((a, b) => (a.week || 0) - (b.week || 0))
    return Response.json({ rainouts })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/rainouts' }
