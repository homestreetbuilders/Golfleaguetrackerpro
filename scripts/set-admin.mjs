// scripts/set-admin.mjs
// Directly writes the admin role to Netlify Blobs for a given email.
//
// Usage:
//   node scripts/set-admin.mjs                        # defaults to admin@fc.com
//   node scripts/set-admin.mjs someone@example.com    # any email
//
// Requires NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID env vars, OR a valid
// Netlify CLI session (npx netlify login). Run from the project root.

import { getStore } from '@netlify/blobs'

const email = (process.argv[2] || 'admin@fc.com').trim().toLowerCase()
const siteID = process.env.NETLIFY_SITE_ID || 'fbd27904-cba5-4f48-9e5e-34803c41bbf2'
const token  = process.env.NETLIFY_AUTH_TOKEN

if (!token) {
  console.error('Error: NETLIFY_AUTH_TOKEN env var is required.')
  console.error('Get your token from: https://app.netlify.com/user/applications#personal-access-tokens')
  console.error('Then run: NETLIFY_AUTH_TOKEN=your_token node scripts/set-admin.mjs')
  process.exit(1)
}

const store = getStore({ name: 'user-roles', siteID, token })
const key   = `role-${email}`

console.log(`Writing admin role for ${email} ...`)
await store.set(key, 'admin')

const verify = await store.get(key, { type: 'text' })
if (verify === 'admin') {
  console.log(`✓ Confirmed: ${email} → "${verify}" in user-roles store`)
} else {
  console.error(`✗ Verification failed — got: ${verify}`)
  process.exit(1)
}
