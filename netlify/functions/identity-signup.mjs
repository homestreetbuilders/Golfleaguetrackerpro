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
  const key = `role-${String(email).toLowerCase()}`

  // Don't overwrite an existing role assignment
  const existing = await store.get(key, { type: 'text' }).catch(() => null)
  if (existing) {
    return Response.json({ success: true, email, role: existing })
  }

  // Determine role for new user.
  // If ADMIN_EMAIL is set, only that address gets admin on first signup.
  // Otherwise fall back to first-user-wins (legacy behaviour).
  const adminEmail = process.env.ADMIN_EMAIL ? String(process.env.ADMIN_EMAIL).trim().toLowerCase() : null
  let role

  if (adminEmail) {
    role = String(email).trim().toLowerCase() === adminEmail ? 'admin' : 'player'
  } else {
    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const hasAnyRole = (blobs || []).some(b => b && b.key && String(b.key).startsWith('role-'))
    role = hasAnyRole ? 'player' : 'admin'
  }

  await store.set(key, role)
  return Response.json({ success: true, email, role })
}
