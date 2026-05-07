import { requireAdmin } from './_auth.mjs'
import { db, COL } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }

// League-scoped collections to wipe on full reset.
// Preserved: leagues, users, courses, league_settings, handicap_config, payment_settings
const RESET_COLLECTIONS = [
  COL.players,
  COL.scores,
  COL.schedule,
  COL.teams,
  COL.pairings,
  COL.matchScorecards,
  COL.scorecardLocks,
  COL.payments,
  COL.handicapHistory,
  COL.handicapOverrides,
  COL.sideGameOptins,
  COL.sideGamesLedger,
  COL.announcements,
  COL.chat,
  COL.rainouts,
  COL.scheduleProposals,
  COL.aiPairings,
  COL.brackets,
  COL.scrambleEvents,
  COL.tournaments,
  COL.shotTracking,
  COL.substitutes,
  COL.profiles,
  COL.seasonOverview,
]

async function deleteLeagueDocs(col, leagueId) {
  const BATCH_SIZE = 400
  let deleted = 0
  while (true) {
    const snap = await db.collection(col).where('leagueId', '==', leagueId).limit(BATCH_SIZE).get()
    if (snap.empty) break
    const batch = db.batch()
    for (const d of snap.docs) batch.delete(d.ref)
    await batch.commit()
    deleted += snap.docs.length
    if (snap.docs.length < BATCH_SIZE) break
  }
  return deleted
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authErr = await requireAdmin(req)
  if (authErr) return authErr

  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body || body.confirm !== 'RESET') return new Response('Confirmation token missing or invalid', { status: 400 })

  const adminEmail = body.adminEmail ? String(body.adminEmail).trim().toLowerCase() : null

  const summary = {}
  for (const col of RESET_COLLECTIONS) {
    try {
      summary[col] = await deleteLeagueDocs(col, leagueId)
    } catch (e) {
      summary[col] = `error: ${e.message}`
    }
  }

  // Audit log — non-fatal if it fails
  try {
    await db.collection('audit_log').add({
      leagueId,
      action: 'FULL_RESET',
      adminEmail,
      timestamp: new Date().toISOString(),
      summary,
    })
  } catch (_) {}

  return Response.json({ success: true, leagueId, summary })
}

export const config = { path: '/api/reset-league' }
