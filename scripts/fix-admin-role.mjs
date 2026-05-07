// scripts/fix-admin-role.mjs
// Ensures ron@homestreetbuilders.com has role:'admin' (lowercase) in Firestore
// at BOTH possible document ID formats:
//   - users/ron@homestreetbuilders.com           (bare email format)
//   - users/kelleys-heroes_ron@homestreetbuilders.com  (league-prefixed format)
//
// Usage: node --use-system-ca scripts/fix-admin-role.mjs

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__dir, '../.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

import { initializeApp }                    from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

const app = initializeApp({
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID,
})
const db = getFirestore(app)

const TARGET_EMAIL  = 'ron@homestreetbuilders.com'
const LEAGUE_ID     = 'kelleys-heroes'
const CORRECT_ROLE  = 'admin'   // always lowercase
const NOW           = new Date().toISOString()

const DOC_IDS = [
  TARGET_EMAIL,                           // bare
  `${LEAGUE_ID}_${TARGET_EMAIL}`,         // league-prefixed
]

for (const docId of DOC_IDS) {
  console.log(`\nChecking users/${docId} ...`)
  const ref  = doc(db, 'users', docId)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    const data = snap.data()
    console.log('  Existing data:', JSON.stringify(data))
    const existingRole = String(data.role || '').trim().toLowerCase()
    if (existingRole !== CORRECT_ROLE) {
      await setDoc(ref, { role: CORRECT_ROLE, updatedAt: NOW }, { merge: true })
      console.log(`  ✓ Updated role: "${data.role}" → "${CORRECT_ROLE}"`)
    } else {
      console.log(`  ✓ Role is already "${data.role}" — normalising to lowercase`)
      await setDoc(ref, { role: CORRECT_ROLE, updatedAt: NOW }, { merge: true })
    }
  } else {
    await setDoc(ref, {
      email:     TARGET_EMAIL,
      role:      CORRECT_ROLE,
      name:      'Ron McCoy',
      leagueId:  docId.includes('_') ? LEAGUE_ID : undefined,
      createdAt: NOW,
      updatedAt: NOW,
    })
    console.log(`  ✓ Created users/${docId} with role: "${CORRECT_ROLE}"`)
  }
}

console.log(`
All done. Both doc formats now have role: "${CORRECT_ROLE}" (lowercase).

What happens at login:
  1. resolveUserRole() checks JWT custom claims → likely empty
  2. Falls back to /api/user-role?email=ron@homestreetbuilders.com&leagueId=kelleys-heroes
  3. user-role.mjs tries "kelleys-heroes_ron@homestreetbuilders.com" → finds role:"admin"
  4. Returns role:"admin" to the frontend
  5. loginSuccess() calls applyRoleAccess("admin") → full Admin UI shown

Backend API auth (_auth.mjs):
  ron@homestreetbuilders.com is hardcoded in HARDCODED_ADMINS → requireAdmin() always passes
`)
