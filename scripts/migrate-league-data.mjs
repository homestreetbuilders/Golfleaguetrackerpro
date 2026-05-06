// scripts/migrate-league-data.mjs
// 1. Patches the leagues/kelleys-heroes doc to add the `id` field
// 2. Seeds Ron McCoy as a player in the players collection
//
// Usage: node --use-system-ca scripts/migrate-league-data.mjs

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__dir, '../.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

import { initializeApp }                      from 'firebase/app'
import { getFirestore, doc, setDoc, getDoc }  from 'firebase/firestore'

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
const NOW       = new Date().toISOString()

// ── 1. Patch league doc — add `id` field ─────────────────────────────────────
console.log('Patching leagues/kelleys-heroes...')
await setDoc(doc(db, 'leagues', LEAGUE_ID), {
  id:        LEAGUE_ID,
  leagueId:  LEAGUE_ID,
  name:      "Kelley's Heroes",
  course:    'Goodpark GC',
  season:    2026,
  createdAt: NOW,
}, { merge: true })
console.log('  ✓ leagues/kelleys-heroes → id field added')

// ── 2. Seed Ron McCoy as a player ─────────────────────────────────────────────
const playerDocId = `${LEAGUE_ID}_ron@homestreetbuilders.com`
console.log(`\nSeeding players/${playerDocId}...`)
const existing = await getDoc(doc(db, 'players', playerDocId))
if (existing.exists() && !existing.data()._placeholder) {
  console.log('  ℹ Player record already exists — skipping')
} else {
  await setDoc(doc(db, 'players', playerDocId), {
    leagueId:  LEAGUE_ID,
    email:     'ron@homestreetbuilders.com',
    name:      'Ron McCoy',
    phone:     '',
    handicap:  null,
    hdcp9:     null,
    hdcp18:    null,
    hcpFront9: null,
    hcpBack9:  null,
    hcp18:     null,
    hcpFront9Override:      false,
    hcpFront9OverrideValue: null,
    hcpBack9Override:       false,
    hcpBack9OverrideValue:  null,
    hcp18Override:          false,
    hcp18OverrideValue:     null,
    createdAt: NOW,
    updatedAt: NOW,
  })
  console.log('  ✓ Ron McCoy added to players collection')
}

// ── 3. Remove _meta placeholders that were seeded earlier ─────────────────────
console.log('\nRemoving placeholder docs...')
const placeholders = [
  `players/${LEAGUE_ID}__meta`,
  `scores/${LEAGUE_ID}__meta`,
  `schedule/${LEAGUE_ID}__meta`,
  `teams/${LEAGUE_ID}__meta`,
]
for (const path of placeholders) {
  const [col, id] = path.split('/')
  const ref = doc(db, col, id)
  const snap = await getDoc(ref)
  if (snap.exists() && snap.data()._placeholder) {
    const { deleteDoc } = await import('firebase/firestore')
    await deleteDoc(ref)
    console.log(`  ✓ Removed ${path}`)
  } else {
    console.log(`  ℹ ${path} not found or not a placeholder — skipped`)
  }
}

console.log('\nMigration complete.')
