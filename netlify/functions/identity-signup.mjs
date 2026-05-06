// identity-signup.mjs — Firebase user creation hook (called from client after signup)
// Since we use Firebase Auth instead of Netlify Identity, this endpoint is called
// by the client after a successful Firebase Auth signup to register the user's role.
// It replicates the first-user-wins admin logic that identity-signup.mjs provided.

import { db, COL } from './_firebase.mjs'
import { emailFromReq } from './_auth.mjs'

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // Require auth token
  const email = emailFromReq(req)
  if (!email) return new Response('Not authenticated', { status: 401 })

  // If user already has a role, return it
  const userSnap = await db.collection(COL.users).doc(email).get()
  if (userSnap.exists && userSnap.data().role) {
    return Response.json({ success: true, email, role: userSnap.data().role, note: 'Already registered' })
  }

  // First-user-wins: check if any admin exists
  const adminEmail = process.env.ADMIN_EMAIL ? String(process.env.ADMIN_EMAIL).trim().toLowerCase() : null
  let role

  if (adminEmail) {
    role = String(email).trim().toLowerCase() === adminEmail ? 'admin' : 'player'
  } else {
    const adminsSnap = await db.collection(COL.users).where('role', '==', 'admin').limit(1).get()
    role = adminsSnap.empty ? 'admin' : 'player'
  }

  await db.collection(COL.users).doc(email).set({ email, role, createdAt: new Date().toISOString() }, { merge: true })
  console.log('[identity-signup] Registered', email, 'as', role)

  return Response.json({ success: true, email, role })
}

// No path config — identity-* functions are event-triggered and cannot have a custom path.
