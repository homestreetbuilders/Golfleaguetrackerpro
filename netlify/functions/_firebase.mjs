// _firebase.mjs — Firebase Admin SDK initialisation for Netlify serverless functions.
// Exports `db` (Firestore instance) used by all data-storage functions.
//
// Required env vars (set in Netlify dashboard → Site settings → Environment variables):
//   FIREBASE_SERVICE_ACCOUNT_JSON  Full service-account JSON as a single string, OR
//   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY  individually.

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore }                  from 'firebase-admin/firestore'

function initAdmin() {
  if (getApps().length) return

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (saJson) {
    try {
      initializeApp({ credential: cert(JSON.parse(saJson)) })
      return
    } catch (e) {
      console.error('[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message)
    }
  }

  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
    return
  }

  throw new Error(
    '[firebase-admin] Missing credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON ' +
    'or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in env vars.'
  )
}

initAdmin()
export const db = getFirestore()

// ── Firestore collection names ────────────────────────────────────────────────
// Top-level collections (user-specified): users, players, scores, schedule, teams
// Additional collections follow the same pattern.
export const COL = {
  leagues:           'leagues',
  users:             'users',          // global — roles, auth data
  players:           'players',
  scores:            'scores',
  schedule:          'schedule',
  teams:             'teams',
  pairings:          'pairings',
  courses:           'courses',
  matchScorecards:   'match_scorecards',
  scorecardLocks:    'scorecard_locks',
  payments:          'payments',
  paymentSettings:   'payment_settings',
  leagueSettings:    'league_settings',
  handicapConfig:    'handicap_config',
  handicapHistory:   'handicap_history',
  handicapOverrides: 'handicap_overrides',
  sideGameOptins:    'side_game_optins',
  sideGamesLedger:   'side_games_ledger',
  announcements:     'announcements',
  chat:              'chat',
  rainouts:          'rainouts',
  scheduleProposals: 'schedule_proposals',
  aiPairings:        'ai_pairings',
  brackets:          'brackets',
  scrambleEvents:    'scramble_events',
  tournaments:       'tournaments',
  shotTracking:      'shot_tracking',
  substitutes:       'substitutes',
  profiles:          'profiles',
  seasonOverview:    'season_overview',
}

// ── Document ID helpers ───────────────────────────────────────────────────────
// All league-scoped docs use `{leagueId}_{localId}` so a single collection
// holds data for every league without sub-collections.

export function lid(leagueId, localId) {
  return `${leagueId}_${localId}`
}

// ── Common query helpers ──────────────────────────────────────────────────────

/** Return all docs in a collection scoped to a league as an array of plain objects. */
export async function listDocs(col, leagueId, extra) {
  let q = db.collection(col).where('leagueId', '==', leagueId)
  if (extra) q = extra(q)
  const snap = await q.get()
  return snap.docs.map(d => d.data())
}

/** Get a single doc by composite ID. Returns data object or null. */
export async function getDoc(col, leagueId, localId) {
  const snap = await db.collection(col).doc(lid(leagueId, localId)).get()
  return snap.exists ? snap.data() : null
}

/** Set (upsert) a doc by composite ID. */
export async function setDoc(col, leagueId, localId, data) {
  await db.collection(col).doc(lid(leagueId, localId)).set({ leagueId, ...data })
}

/** Delete a doc by composite ID. */
export async function deleteDoc(col, leagueId, localId) {
  await db.collection(col).doc(lid(leagueId, localId)).delete()
}

/** Add a new doc with auto-generated ID. Returns the new doc reference. */
export async function addDoc(col, leagueId, data) {
  return db.collection(col).add({ leagueId, ...data })
}
