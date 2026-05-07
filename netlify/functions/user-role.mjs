import { db, COL } from './_firebase.mjs'

// Emails that are always treated as admin regardless of Firestore doc format.
// Belt-and-suspenders fallback for the league owner account.
const HARDCODED_ADMINS = ['ron@homestreetbuilders.com']

export default async (req) => {
  if (req.method === 'GET') {
    const url      = new URL(req.url)
    const email    = url.searchParams.get('email')
    const leagueId = url.searchParams.get('leagueId')
    if (!email) return new Response('Missing email', { status: 400 })

    const key = String(email).trim().toLowerCase()

    // Build candidate doc IDs — try league-prefixed first (actual storage format),
    // then bare email (legacy / cross-league accounts).
    const candidates = []
    if (leagueId) {
      const prefix = String(leagueId).trim().toLowerCase()
      candidates.push(`${prefix}_${key}`)   // e.g. kelleys-heroes_ron@homestreetbuilders.com
    }
    candidates.push(key)                    // e.g. ron@homestreetbuilders.com

    console.log('[user-role] lookup email:', key, '| leagueId:', leagueId || '(none)')
    console.log('[user-role] trying doc IDs:', candidates.join(', '))

    let role = null
    for (const docId of candidates) {
      const snap = await db.collection(COL.users).doc(docId).get()
      if (snap.exists) {
        const raw = snap.data().role
        console.log('[user-role] found doc', docId, '→ raw role:', raw)
        if (raw) {
          role = String(raw).trim().toLowerCase()
          break
        }
      } else {
        console.log('[user-role] doc not found:', docId)
      }
    }

    // Hardcoded admin fallback — always grants admin to league owner
    // regardless of which Firestore doc ID format was used.
    if (!role && HARDCODED_ADMINS.includes(key)) {
      role = 'admin'
      console.log('[user-role] hardcoded admin fallback applied for', key)
    }

    role = role || 'player'
    console.log('[user-role] final role for', key, ':', role)

    return Response.json({ email: key, role })
  }
  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/user-role' }
