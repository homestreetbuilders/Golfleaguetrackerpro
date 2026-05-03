import { getStore } from '@netlify/blobs'
import { requireAdmin } from './_auth.mjs'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authErr = requireAdmin(req)
  if (authErr) return authErr

  const body = await req.json().catch(() => null)
  const email = body && body.email
  const role = body && body.role

  if (!email || !role) {
    return new Response('Missing email or role', { status: 400 })
  }

  const normalizedRole = String(role).toLowerCase()
  if (!['admin', 'scorer', 'player'].includes(normalizedRole)) {
    return new Response('Invalid role', { status: 400 })
  }

  const store = getStore('user-roles')
  const key = `role-${String(email).toLowerCase()}`
  await store.set(key, normalizedRole)

  return Response.json({ success: true, email, role: normalizedRole })
}

export const config = {
  path: '/api/set-role'
}
