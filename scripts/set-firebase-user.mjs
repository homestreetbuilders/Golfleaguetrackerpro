// scripts/set-firebase-user.mjs
// Create or update a Firebase Auth user and set their Firestore role.
//
// Usage:
//   node --use-system-ca scripts/set-firebase-user.mjs
//
// Requires Firebase Admin SDK credentials via ONE of:
//   (a) FIREBASE_SERVICE_ACCOUNT_JSON env var (full service-account JSON string)
//   (b) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars
//   (c) Application Default Credentials (firebase login / gcloud auth)

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Load .env ────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

// ── Config ───────────────────────────────────────────────────────────────────
const TARGET_EMAIL    = 'ron@homestreetbuilders.com'
const TARGET_PASSWORD = 'Admin2026'
const LEAGUE_ID       = 'kelleys-heroes'

// ── Firebase Admin SDK ───────────────────────────────────────────────────────
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app'
import { getAuth }      from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function initAdmin() {
  if (getApps().length) return

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (saJson) {
    try {
      initializeApp({ credential: cert(JSON.parse(saJson)) })
      return
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message)
    }
  }

  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
    return
  }

  // Fall back to Application Default Credentials
  console.log('No explicit credentials found — trying Application Default Credentials...')
  initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID })
}

initAdmin()
const auth = getAuth()
const db   = getFirestore()

// ── Auth: create or update ───────────────────────────────────────────────────
let uid
try {
  const existing = await auth.getUserByEmail(TARGET_EMAIL)
  uid = existing.uid
  await auth.updateUser(uid, { password: TARGET_PASSWORD })
  console.log(`✓ Auth user found — password updated for ${TARGET_EMAIL}`)
} catch (err) {
  if (err.code === 'auth/user-not-found') {
    const created = await auth.createUser({
      email:         TARGET_EMAIL,
      password:      TARGET_PASSWORD,
      emailVerified: true,
    })
    uid = created.uid
    console.log(`✓ Auth user created: ${TARGET_EMAIL} (uid: ${uid})`)
  } else {
    throw err
  }
}

// ── Firestore: upsert user doc with admin role ────────────────────────────────
const docId = `${LEAGUE_ID}_${TARGET_EMAIL}`
await db.collection('users').doc(docId).set({
  leagueId:  LEAGUE_ID,
  email:     TARGET_EMAIL,
  uid,
  role:      'admin',
  updatedAt: new Date().toISOString(),
}, { merge: true })

console.log(`✓ Firestore users/${docId} → role: admin`)
console.log('\nDone.')
