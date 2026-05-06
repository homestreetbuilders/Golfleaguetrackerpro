import { db, COL } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    if (!body) return new Response('Invalid request body', { status: 400 })
    const formula = {
      bestN: body.bestN || 8, lastN: body.lastN || 20, multiplier: body.multiplier || 0.96,
      maxHcp: body.maxHcp || 36, minRounds: body.minRounds || 3, bonus: body.bonus || 'none',
      leagueId, updatedAt: new Date().toISOString()
    }
    await db.collection(COL.handicapConfig).doc(leagueId).set(formula)
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const snap = await db.collection(COL.handicapConfig).doc(leagueId).get()
    if (!snap.exists) return Response.json({ bestN: 8, lastN: 20, multiplier: 0.96, maxHcp: 36, minRounds: 3, bonus: 'none' })
    return Response.json(snap.data())
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/handicap-formula' }
