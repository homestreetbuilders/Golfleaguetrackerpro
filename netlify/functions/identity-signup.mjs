// identity-signup.mjs — Netlify Identity event trigger on new user signup.
// Sets the user's role in app_metadata via the GoTrue admin API so it
// appears in the JWT on their first login.

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.json().catch(() => null)
  const user     = body && body.user
  const identity = body && body.identity

  if (!user || !user.email || !user.id) {
    return new Response('Missing user data', { status: 400 })
  }

  // Determine role for this new user
  const adminEmail = process.env.ADMIN_EMAIL
    ? String(process.env.ADMIN_EMAIL).trim().toLowerCase()
    : null

  let role
  if (adminEmail) {
    role = String(user.email).trim().toLowerCase() === adminEmail ? 'admin' : 'player'
  } else {
    // First-user-wins: check if any admin already exists via the Identity admin API
    role = 'player'
    if (identity && identity.url && identity.token) {
      try {
        const listRes = await fetch(`${identity.url}/admin/users?per_page=100`, {
          headers: { Authorization: `Bearer ${identity.token}` }
        })
        if (listRes.ok) {
          const data = await listRes.json()
          const anyAdmin = (data.users || []).some(u =>
            u.id !== user.id &&
            Array.isArray(u.app_metadata && u.app_metadata.roles) &&
            u.app_metadata.roles.includes('admin')
          )
          if (!anyAdmin) role = 'admin'
        }
      } catch (e) { /* fallback to player */ }
    }
  }

  // Write role to app_metadata via GoTrue admin API
  if (identity && identity.url && identity.token) {
    try {
      const prevAm = user.app_metadata && typeof user.app_metadata === 'object' ? user.app_metadata : {}
      await fetch(`${identity.url}/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${identity.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ app_metadata: { ...prevAm, roles: [role] } })
      })
    } catch (e) { /* non-fatal — user can be assigned role manually */ }
  }

  return Response.json({ success: true, email: user.email, role })
}
