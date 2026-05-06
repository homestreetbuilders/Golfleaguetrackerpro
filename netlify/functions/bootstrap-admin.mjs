// bootstrap-admin.mjs
// One-time endpoint to grant admin role to the calling user.
//
// Safe conditions — grants admin if ANY of these are true:
//   1. Zero admin accounts exist in the system (first-admin-wins, no secret needed)
//   2. A BOOTSTRAP_SECRET env var is set and ?secret= matches it
//
// The role is written to COL.users in Firestore so all future auth checks find it normally.

import { db, COL } from './_firebase.mjs'
import { emailFromReq } from './_auth.mjs'

export default async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const email = emailFromReq(req)
  if (!email) {
    return Response.json({
      error: 'Not authenticated',
      hint: 'Run this from the browser console while logged in: ' +
            'const t = await firebase.auth().currentUser.getIdToken(); ' +
            'fetch("/api/bootstrap-admin", {headers:{Authorization:"Bearer "+t}}).then(r=>r.json()).then(console.log)'
    }, { status: 401 })
  }

  // Check if caller is already admin
  const userSnap = await db.collection(COL.users).doc(email).get()
  const userData = userSnap.exists ? userSnap.data() : {}
  if (userData.role === 'admin') {
    return Response.json({ success: true, email, role: 'admin', note: 'Already admin — no change needed' })
  }

  // Condition 1: zero admins in the system → safe to bootstrap
  const adminsSnap = await db.collection(COL.users).where('role', '==', 'admin').limit(1).get()
  const hasAnyAdmin = !adminsSnap.empty

  // Condition 2: secret matches BOOTSTRAP_SECRET env var
  const secret = process.env.BOOTSTRAP_SECRET ? String(process.env.BOOTSTRAP_SECRET).trim() : null
  const url = new URL(req.url)
  const provided = (url.searchParams.get('secret') || '').trim()
  const secretMatches = secret && provided && provided === secret

  if (!hasAnyAdmin || secretMatches) {
    await db.collection(COL.users).doc(email).set({ email, role: 'admin', updatedAt: new Date().toISOString() }, { merge: true })
    console.log('[bootstrap-admin] Granted admin to', email, hasAnyAdmin ? '(secret matched)' : '(no admins existed)')
    return Response.json({ success: true, email, role: 'admin', note: 'Admin role granted' })
  }

  return Response.json({
    error: 'An admin already exists. Provide ?secret=BOOTSTRAP_SECRET to force-grant admin.',
    email
  }, { status: 403 })
}

export const config = { path: '/api/bootstrap-admin' }
