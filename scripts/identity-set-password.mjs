// scripts/identity-set-password.mjs — Set Identity password (+ optional FC role via app_metadata.roles)
//
// Requires NETLIFY_AUTH_TOKEN (Dashboard → Applications → Personal access tokens)
// and NETLIFY_SITE_ID for the deployed site that has Identity enabled.
//
// Usage (PowerShell example):
//   $env:NETLIFY_AUTH_TOKEN="..."; $env:NETLIFY_SITE_ID="..." ; node scripts/identity-set-password.mjs ron@example.com Admin2026 admin

const netlifyToken = process.env.NETLIFY_AUTH_TOKEN
const siteId = process.env.NETLIFY_SITE_ID
const [, , emailRaw, passwordRaw, roleOpt] = process.argv

function usage() {
  console.error(`
Usage:
  node scripts/identity-set-password.mjs <email> <newPassword> [admin|scorer|player]

Env:
  NETLIFY_AUTH_TOKEN  — Netlify personal access token
  NETLIFY_SITE_ID     — UUID of the Fairway Command site on Netlify
`)
}

if (!emailRaw || !passwordRaw) {
  usage()
  process.exit(1)
}

if (!netlifyToken || !siteId) {
  usage()
  console.error('Missing NETLIFY_AUTH_TOKEN or NETLIFY_SITE_ID.')
  process.exit(1)
}

const email = String(emailRaw).trim().toLowerCase()
const password = String(passwordRaw)
const roleWant = roleOpt ? String(roleOpt).trim().toLowerCase() : null
if (roleWant && !['admin', 'scorer', 'player'].includes(roleWant)) {
  console.error('Third argument must be admin, scorer, or player.')
  process.exit(1)
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts)
  const text = await res.text().catch(() => '')
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    console.error(`${res.status}`, text || '')
    throw new Error(`HTTP ${res.status}`)
  }
  return json
}

console.log(`Resolving Identity instance for site ${siteId} ...`)

const site = await fetchJson(`https://api.netlify.com/api/v1/sites/${siteId}`, {
  headers: { Authorization: `Bearer ${netlifyToken}` }
}).catch(() => null)

const instanceId = site && site.identity_instance_id
if (!instanceId) {
  console.error('This site does not have Netlify Identity enabled (identity_instance_id missing).')
  process.exit(1)
}

const base = `https://api.netlify.com/api/v1/sites/${siteId}/identity/${instanceId}/users`

const list = await fetchJson(`${base}?per_page=200`, {
  headers: { Authorization: `Bearer ${netlifyToken}` }
})

const rows = Array.isArray(list) ? list : []
const user = rows.find(u => String(u.email || '').toLowerCase() === email)

if (!user) {
  console.error(`No Identity user found matching ${email}`)
  process.exit(1)
}

const prevAm = user.app_metadata && typeof user.app_metadata === 'object' ? { ...user.app_metadata } : {}
const nextMeta = roleWant ? { ...prevAm, roles: [roleWant] } : { ...prevAm }

const patch = { password }
if (roleWant) patch.app_metadata = nextMeta

console.log(`Updating user ${email} (id=${user.id}) password${roleWant ? ` + roles → [${roleWant}]` : ''} …`)

await fetchJson(`${base}/${user.id}`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${netlifyToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(patch)
})

console.log('Done — have the user sign in via the deployed site\'s Login form (Identity / email + password).')
