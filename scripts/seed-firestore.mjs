// scripts/seed-firestore.mjs
// Seeds Firestore with Kelley's Heroes league data.
//
// Usage:
//   node scripts/seed-firestore.mjs
//
// Reads Firebase config from .env in the project root.
// Uses the Firebase client SDK — no service-account required.

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Load .env manually (no dotenv dependency) ────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env')
const envLines = readFileSync(envPath, 'utf8').split('\n')
for (const line of envLines) {
  const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

// ── Firebase client SDK ──────────────────────────────────────────────────────
import { initializeApp }                          from 'firebase/app'
import { getFirestore, doc, setDoc, collection,
         writeBatch, serverTimestamp }            from 'firebase/firestore'

const app = initializeApp({
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID,
})

const db = getFirestore(app)

const LEAGUE_ID = 'kelleys-heroes'

// ── Seed data ────────────────────────────────────────────────────────────────

const writes = []
const counts = {}

function record(col, docId, data) {
  writes.push({ col, docId, data })
  counts[col] = (counts[col] || 0) + 1
}

// 1. League document
record('leagues', LEAGUE_ID, {
  leagueId:  LEAGUE_ID,
  name:      "Kelley's Heroes",
  course:    'Goodpark GC',
  createdAt: new Date().toISOString(),
  season:    2026,
})

// 2. Admin user
record('users', `${LEAGUE_ID}_ron@homestreetbuilders.com`, {
  leagueId: LEAGUE_ID,
  email:    'ron@homestreetbuilders.com',
  role:     'admin',
  createdAt: new Date().toISOString(),
})

// 3. Empty collection placeholders — Firestore requires at least one doc
//    per collection. These _meta sentinel docs mark the collections as
//    intentionally empty (no real player/score/etc data yet).
for (const col of ['players', 'scores', 'schedule', 'teams']) {
  record(col, `${LEAGUE_ID}__meta`, {
    leagueId:    LEAGUE_ID,
    _placeholder: true,
    note:        'Collection initialised — no data yet.',
    createdAt:   new Date().toISOString(),
  })
}

// ── Write in batches of 500 (Firestore limit) ─────────────────────────────────
const BATCH_SIZE = 500
for (let i = 0; i < writes.length; i += BATCH_SIZE) {
  const batch = writeBatch(db)
  for (const { col, docId, data } of writes.slice(i, i + BATCH_SIZE)) {
    batch.set(doc(db, col, docId), data)
  }
  await batch.commit()
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\nFirestore seed complete.\n')
console.log('Collection          Documents')
console.log('─────────────────── ─────────')
for (const [col, n] of Object.entries(counts)) {
  console.log(`${col.padEnd(19)} ${n}`)
}
const total = Object.values(counts).reduce((s, n) => s + n, 0)
console.log('─────────────────── ─────────')
console.log(`${'TOTAL'.padEnd(19)} ${total}`)
console.log()
