import { getStore } from '@netlify/blobs'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.json().catch(() => null)
  const email = body && body.email
  if (!email) {
    return new Response('Missing email', { status: 400 })
  }

  const store = getStore('user-roles')

  const { blobs } = await store.list().catch(() => ({ blobs: [] }))
  const isFirstUser = !blobs || blobs.length === 0
  const role = isFirstUser ? 'admin' : 'player'

  const key = `role-${email.toLowerCase()}`
  const existing = await store.get(key, { type: 'text' }).catch(() => null)
  if (!existing) {
    await store.set(key, role)
  }

  return Response.json({ success: true, email, role: existing || role })
}
