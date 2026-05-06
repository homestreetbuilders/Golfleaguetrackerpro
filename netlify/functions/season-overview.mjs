import { db, COL } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const snap = await db.collection(COL.seasonOverview).doc(leagueId).get()
    return Response.json({ rules: snap.exists ? snap.data() : { title: 'Season Overview', content: '' } })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const title = body && body.title ? String(body.title) : 'Season Overview'
    const content = body && body.content ? String(body.content) : ''
    const updated = { leagueId, title, content, updatedAt: new Date().toISOString() }
    await db.collection(COL.seasonOverview).doc(leagueId).set(updated)
    return Response.json({ success: true, rules: updated })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/season-overview' }
