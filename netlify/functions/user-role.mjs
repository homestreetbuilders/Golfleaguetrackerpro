import { db, COL } from './_firebase.mjs'

export default async (req) => {
  if (req.method === 'GET') {
    const url   = new URL(req.url)
    const email = url.searchParams.get('email')
    if (!email) return new Response('Missing email', { status: 400 })
    const key   = String(email).trim().toLowerCase()
    const snap  = await db.collection(COL.users).doc(key).get()
    const role  = (snap.exists && snap.data().role) || 'player'
    return Response.json({ email: key, role })
  }
  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/user-role' }
