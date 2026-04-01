import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('profiles')

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const email = url.searchParams.get('email')
    if (!email) {
      return new Response('Missing email', { status: 400 })
    }
    const key = `profile-${String(email).toLowerCase()}`
    const profile = await store.get(key, { type: 'json' })
    return Response.json(profile || { email })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const email = body && body.email
    if (!email) {
      return new Response('Missing email', { status: 400 })
    }
    const key = `profile-${String(email).toLowerCase()}`
    const existing = (await store.get(key, { type: 'json' })) || {}
    const updated = {
      ...existing,
      email,
      name: body.name || existing.name || null,
      phone: body.phone || existing.phone || null,
      updatedAt: new Date().toISOString()
    }
    await store.setJSON(key, updated)
    return Response.json({ success: true, profile: updated })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/profile'
}
