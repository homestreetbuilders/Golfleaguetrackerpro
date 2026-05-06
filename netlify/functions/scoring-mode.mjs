import { db, COL } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const snap = await db.collection(COL.leagueSettings).doc(leagueId).get()
    const mode = snap.exists ? (snap.data().scoringMode || 'batch') : 'batch'
    return Response.json({ mode })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const normalized = String(body && body.mode || '').toLowerCase()
    if (!['live', 'batch'].includes(normalized)) return new Response('Invalid mode', { status: 400 })
    await db.collection(COL.leagueSettings).doc(leagueId).set(
      { scoringMode: normalized, leagueId },
      { merge: true }
    )
    return Response.json({ success: true, mode: normalized })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/scoring-mode' }
