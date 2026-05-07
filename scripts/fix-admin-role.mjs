// scripts/fix-admin-role.mjs
// Ensures ron@homestreetbuilders.com has role:'admin' in Firestore users collection.
// Uses the Firebase client SDK (web API key only — no service account needed).
//
// Usage: node --use-system-ca scripts/fix-admin-role.mjs
//
// NOTE: Setting Firebase Auth custom claims requires the Admin SDK (service account).
// As a backend auth fallback, add ADMIN_EMAIL=ron@homestreetbuilders.com to Netlify
// environment variables — _auth.mjs already honors this env var.

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__dir, '../.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

import { initializeApp }               from 'firebase/app'
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

const TARGET_EMAIL = 'ron@homestreetbuilders.com'
const NOW          = new Date().toISOString()

// ── Check / upsert Firestore users doc ───────────────────────────────────────
console.log(`\nChecking Firestore users/${TARGET_EMAIL} ...`)
const userRef  = doc(db, 'users', TARGET_EMAIL)
const userSnap = await getDoc(userRef)

if (userSnap.exists()) {
  const data = userSnap.data()
  console.log('  Existing doc:', JSON.stringify(data))
  if (String(data.role || '').toLowerCase() !== 'admin') {
    await setDoc(userRef, { role: 'admin', updatedAt: NOW }, { merge: true })
    console.log(`  ✓ Updated role: "${data.role || '(none)'}" → "admin"`)
  } else {
    console.log(`  ✓ role is already "${data.role}" — no change needed`)
  }
} else {
  await setDoc(userRef, {
    email:     TARGET_EMAIL,
    role:      'admin',
    name:      'Ron McCoy',
    createdAt: NOW,
    updatedAt: NOW,
  })
  console.log(`  ✓ Created users/${TARGET_EMAIL} with role: "admin"`)
}

console.log(`
Done.

IMPORTANT — two more steps required for full admin access:

1. Add this environment variable to Netlify (Site settings → Environment variables):
     ADMIN_EMAIL = ron@homestreetbuilders.com
   This makes _auth.mjs grant admin to Ron on all backend API calls without
   needing Firebase custom claims.

2. Sign out and sign back in as ${TARGET_EMAIL} in the app so the updated
   role is picked up from Firestore on the next /api/user-role call.
`)
