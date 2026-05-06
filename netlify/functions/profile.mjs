import { db, COL } from './_firebase.mjs'

export default async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const email = url.searchParams.get('email')
    if (!email) return new Response('Missing email', { status: 400 })
    const key = String(email).toLowerCase()
    const snap = await db.collection(COL.profiles).doc(key).get()
    return Response.json(snap.exists ? snap.data() : { email })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const email = body && body.email
    if (!email) return new Response('Missing email', { status: 400 })
    const key = String(email).toLowerCase()
    const snap = await db.collection(COL.profiles).doc(key).get()
    const existing = snap.exists ? snap.data() : {}
    const updated = {
      ...existing,
      email,
      name: body.name || existing.name || null,
      phone: body.phone || existing.phone || null,
      updatedAt: new Date().toISOString()
    }
    await db.collection(COL.profiles).doc(key).set(updated)
    return Response.json({ success: true, profile: updated })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/profile' }
