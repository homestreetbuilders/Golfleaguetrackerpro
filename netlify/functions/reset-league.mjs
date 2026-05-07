// reset-league.mjs
// Deletes all league-scoped Firestore documents using the Firestore REST API
// authenticated with the caller's Firebase ID token.
// No Admin SDK / service account required — only FIREBASE_PROJECT_ID env var.

import { requireAdmin } from './_auth.mjs'

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function extractToken(req) {
  const auth = req.headers.get('authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null
}

// Collections to wipe — all league-scoped data.
// Preserved: leagues, users, courses, league_settings, handicap_config, payment_settings
const RESET_COLLECTIONS = [
  'players',
  'scores',
  'schedule',
  'teams',
  'pairings',
  'match_scorecards',
  'scorecard_locks',
  'payments',
  'handicap_history',
  'handicap_overrides',
  'side_game_optins',
  'side_games_ledger',
  'announcements',
  'chat',
  'rainouts',
  'schedule_proposals',
  'ai_pairings',
  'brackets',
  'scramble_events',
  'tournaments',
  'shot_tracking',
  'substitutes',
  'profiles',
  'season_overview',
]

const BATCH_SIZE = 400   // Firestore batchWrite max is 500; stay under

// Query up to BATCH_SIZE doc names in `col` where leagueId == leagueId.
// Returns an array of fully-qualified Firestore resource name strings.
async function queryDocNames(fsBase, col, leagueId, token) {
  const res = await fetch(`${fsBase}:runQuery`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: col }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'leagueId' },
            op: 'EQUAL',
            value: { stringValue: leagueId },
          },
        },
        limit: BATCH_SIZE,
      },
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`runQuery ${col}: HTTP ${res.status} — ${txt.slice(0, 200)}`)
  }

  const rows = await res.json()
  // Each row is either { document: { name, fields, ... } } or { readTime } (empty result sentinel)
  return Array.isArray(rows)
    ? rows.filter(r => r.document && r.document.name).map(r => r.document.name)
    : []
}

// Delete an array of doc resource names in one batchWrite call.
async function batchDeleteDocs(fsBase, docNames, token) {
  const res = await fetch(`${fsBase}:batchWrite`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      writes: docNames.map(name => ({ delete: name })),
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`batchWrite: HTTP ${res.status} — ${txt.slice(0, 200)}`)
  }
}

// Delete all docs in `col` scoped to `leagueId`, looping in batches.
async function deleteCollection(fsBase, col, leagueId, token) {
  let deleted = 0
  while (true) {
    const names = await queryDocNames(fsBase, col, leagueId, token)
    if (!names.length) break
    await batchDeleteDocs(fsBase, names, token)
    deleted += names.length
    if (names.length < BATCH_SIZE) break   // last page — done
  }
  return deleted
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // Verify caller is an admin (reads JWT from Authorization header via _auth.mjs)
  const authErr = await requireAdmin(req)
  if (authErr) return authErr

  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body || body.confirm !== 'RESET') {
    return new Response('Confirmation token missing or invalid', { status: 400 })
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  if (!projectId) {
    return new Response('FIREBASE_PROJECT_ID env var not configured', { status: 500 })
  }

  // The same Bearer token the browser sent — used to authenticate Firestore REST calls.
  // Firestore security rules apply; the caller must have delete permission on these docs.
  const token = extractToken(req)
  if (!token) return new Response('Missing auth token', { status: 401 })

  const fsBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  const adminEmail = body.adminEmail ? String(body.adminEmail).trim().toLowerCase() : null

  const summary = {}
  for (const col of RESET_COLLECTIONS) {
    try {
      summary[col] = await deleteCollection(fsBase, col, leagueId, token)
    } catch (e) {
      console.error(`[reset-league] error deleting ${col}:`, e.message)
      summary[col] = `error: ${e.message}`
    }
  }

  // Audit log — non-fatal
  try {
    const auditUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/audit_log`
    await fetch(auditUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: {
          leagueId:   { stringValue: leagueId },
          action:     { stringValue: 'FULL_RESET' },
          adminEmail: { stringValue: adminEmail || '' },
          timestamp:  { stringValue: new Date().toISOString() },
          summary:    { stringValue: JSON.stringify(summary) },
        },
      }),
    })
  } catch (_) {}

  return Response.json({ success: true, leagueId, summary })
}

export const config = { path: '/api/reset-league' }
