import { requireAdmin } from './_auth.mjs'
import { db, COL } from './_firebase.mjs'

// Updates a user's role in Firestore `users` collection.
// Also updates Firebase Auth custom claims via Admin SDK so the role appears in the JWT.
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authErr = await requireAdmin(req)
  if (authErr) return authErr

  const body     = await req.json().catch(() => null)
  const email    = body && body.email    ? String(body.email).trim().toLowerCase()    : null
  const role     = body && body.role     ? String(body.role).trim().toLowerCase()     : null
  const leagueId = body && body.leagueId ? String(body.leagueId).trim().toLowerCase() : null

  if (!email || !role) return new Response('Missing email or role', { status: 400 })
  if (!['admin', 'scorer', 'player'].includes(role)) {
    return new Response('Invalid role — must be admin, scorer, or player', { status: 400 })
  }

  const now = new Date().toISOString()
  const writes = []

  // Write to league-prefixed doc (e.g. kelleys-heroes_ron@...) — primary lookup format
  if (leagueId) {
    const prefixedId = `${leagueId}_${email}`
    writes.push(db.collection(COL.users).doc(prefixedId).set(
      { email, role, leagueId, updatedAt: now }, { merge: true }
    ))
  }

  // Also write to bare email doc — used by identity-signup and bootstrap-admin
  writes.push(db.collection(COL.users).doc(email).set(
    { email, role, updatedAt: now }, { merge: true }
  ))

  await Promise.all(writes)

  // Optionally update Firebase Auth custom claims (requires Admin SDK — non-fatal if user not found)
  try {
    const { getAuth } = await import('firebase-admin/auth')
    const auth = getAuth()
    const fbUser = await auth.getUserByEmail(email).catch(() => null)
    if (fbUser) {
      await auth.setCustomUserClaims(fbUser.uid, { role })
    }
  } catch (e) {
    console.warn('[set-role] Could not update Firebase Auth custom claims:', e.message)
  }

  return Response.json({ success: true, email, role })
}

export const config = { path: '/api/set-role' }
