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
    const role = await store.get(key, { type: 'text' })
    return Response.json({ email, role: role || 'player' })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/user-role'
}
