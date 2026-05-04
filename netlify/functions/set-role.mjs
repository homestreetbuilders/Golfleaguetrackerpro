import { requireAdmin } from './_auth.mjs'

// Updates a user's role in Netlify Identity app_metadata so it appears
// in their JWT on next login/refresh. Requires NETLIFY_TOKEN env var
// (a Netlify personal access token with site access).
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authErr = await requireAdmin(req)
  if (authErr) return authErr

  const body = await req.json().catch(() => null)
  const email = body && body.email ? String(body.email).trim().toLowerCase() : null
  const role  = body && body.role  ? String(body.role).trim().toLowerCase()  : null

  if (!email || !role) {
    return new Response('Missing email or role', { status: 400 })
  }
  if (!['admin', 'scorer', 'player'].includes(role)) {
    return new Response('Invalid role — must be admin, scorer, or player', { status: 400 })
  }

  const netlifyToken = process.env.NETLIFY_TOKEN
  const siteId       = process.env.NETLIFY_SITE_ID
  if (!netlifyToken || !siteId) {
    return new Response('Server misconfigured: NETLIFY_TOKEN or NETLIFY_SITE_ID not set', { status: 500 })
  }

  // Resolve the Identity instance ID from the site config
  const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
    headers: { Authorization: `Bearer ${netlifyToken}` }
  }).catch(() => null)
  if (!siteRes || !siteRes.ok) {
    return new Response('Failed to fetch site info from Netlify API', { status: 502 })
  }
  const site       = await siteRes.json()
  const instanceId = site.identity_instance_id
  if (!instanceId) {
    return new Response('Netlify Identity is not enabled for this site', { status: 500 })
  }

  const base = `https://api.netlify.com/api/v1/sites/${siteId}/identity/${instanceId}/users`

  // Find the user by email
  const listRes = await fetch(`${base}?per_page=100`, {
    headers: { Authorization: `Bearer ${netlifyToken}` }
  }).catch(() => null)
  if (!listRes || !listRes.ok) {
    return new Response('Failed to list Identity users', { status: 502 })
  }
  const users = await listRes.json()
  const user  = Array.isArray(users) ? users.find(u => String(u.email || '').toLowerCase() === email) : null
  if (!user) {
    return new Response(`No Netlify Identity account found for ${email}`, { status: 404 })
  }

  // Update app_metadata.roles
  const updateRes = await fetch(`${base}/${user.id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${netlifyToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_metadata: { roles: [role] } })
  }).catch(() => null)
  if (!updateRes || !updateRes.ok) {
    return new Response('Failed to update user role in Netlify Identity', { status: 502 })
  }

  const updated = await updateRes.json()
  return Response.json({
    success: true,
    email:   updated.email,
    role,
    app_metadata: updated.app_metadata
  })
}

export const config = {
  path: '/api/set-role'
}
