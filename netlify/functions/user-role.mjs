import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('user-roles')

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const email = url.searchParams.get('email')
    if (!email) {
      return new Response('Missing email', { status: 400 })
    }
    const key = `role-${email.toLowerCase()}`

    const existing = await store.get(key, { type: 'text' }).catch(() => null)
    if (existing) {
      return Response.json({ email, role: existing })
    }

    // Bootstrap: if there are no roles at all yet, make the first requester an admin.
    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const hasAnyRole = (blobs || []).some(b => b && b.key && String(b.key).startsWith('role-'))
    if (!hasAnyRole) {
      await store.set(key, 'admin')
      return Response.json({ email, role: 'admin', bootstrapped: true })
    }

    return Response.json({ email, role: 'player' })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/user-role'
}
