// scripts/check-firestore.mjs — Query all key collections for kelleys-heroes
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__dir, '../.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (saJson) {
    const { initializeApp: ia, cert: c } = await import('firebase-admin/app')
    initializeApp({ credential: cert(JSON.parse(saJson)) })
  } else {
    initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID })
  }
}

const db = getFirestore()
const LEAGUE_ID = 'kelleys-heroes'

async function countAndSample(colName) {
  const snap = await db.collection(colName).where('leagueId', '==', LEAGUE_ID).get()
  const docs = snap.docs.map(d => d.data())
  return { count: docs.length, samples: docs.slice(0, 3) }
}

async function checkGlobal(colName) {
  const snap = await db.collection(colName).get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

const collections = ['players', 'scores', 'schedule', 'teams', 'users', 'leagues']
console.log('\n=== Firestore data check for leagueId: kelleys-heroes ===\n')

for (const col of collections) {
  try {
    if (col === 'users' || col === 'leagues') {
      const docs = await checkGlobal(col)
      const relevant = docs.filter(d => !d.leagueId || d.leagueId === LEAGUE_ID || d.id === LEAGUE_ID)
      console.log(`${col}: ${relevant.length} doc(s)`)
      relevant.forEach(d => console.log('  ', JSON.stringify(d)))
    } else {
      const { count, samples } = await countAndSample(col)
      console.log(`${col}: ${count} doc(s)`)
      samples.forEach(d => console.log('  ', JSON.stringify(d)))
    }
  } catch(e) {
    console.log(`${col}: ERROR — ${e.message}`)
  }
  console.log()
}
