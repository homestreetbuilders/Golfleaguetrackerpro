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
    // Return the stored role, or 'player' as the safe default.
    // Auto-bootstrap (making arbitrary callers admin) is intentionally removed —
    // admin assignment happens only via identity-signup.mjs on account creation.
    return Response.json({ email, role: existing || 'player' })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/user-role'
}
