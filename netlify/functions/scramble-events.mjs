import { db, COL, lid, listDocs, getDoc, setDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function clampTeamSize(v) { const n = asInt(v); if (!n) return 4; return Math.min(4, Math.max(2, n)) }
function normalizeScoringType(v) { const s = String(v || '').toLowerCase(); const a = ['stroke_gross','stroke_net','stableford','best_ball']; return a.includes(s) ? s : 'stroke_gross' }
function normalizeEventId(v) { const s = String(v || '').trim(); return s || null }

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  const id = normalizeEventId(url.searchParams.get('id'))
  const action = (url.searchParams.get('action') || '').toLowerCase()

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)

    if (action === 'create') {
      const date = body && body.date ? String(body.date) : null
      if (!date) return new Response('Missing date', { status: 400 })
      const eventId = `scramble-${Date.now()}`
      const createdAt = new Date().toISOString()
      const event = {
        id: eventId,
        week: asInt(body && body.week) || null,
        name: body && body.name ? String(body.name) : 'Scramble Event',
        date,
        course: body && body.course ? String(body.course) : '',
        teeTime: body && body.teeTime ? String(body.teeTime) : '',
        teamSize: clampTeamSize(body && body.teamSize),
        scoringType: normalizeScoringType(body && body.scoringType),
        notes: body && body.notes ? String(body.notes) : '',
        teams: [], scores: {},
        createdAt, updatedAt: createdAt
      }
      await setDoc(COL.scrambleEvents, leagueId, eventId, event)
      return Response.json({ success: true, event })
    }

    if (action === 'save_teams') {
      const eventId = normalizeEventId(body && body.id)
      const teams = Array.isArray(body && body.teams) ? body.teams : null
      if (!eventId || !teams) return new Response('Missing id or teams', { status: 400 })
      const existing = await getDoc(COL.scrambleEvents, leagueId, eventId)
      if (!existing) return new Response('Event not found', { status: 404 })
      const updated = { ...existing, teams, updatedAt: new Date().toISOString() }
      await setDoc(COL.scrambleEvents, leagueId, eventId, updated)
      return Response.json({ success: true, event: updated })
    }

    if (action === 'submit_score') {
      const eventId = normalizeEventId(body && body.id)
      const teamId = body && body.teamId ? String(body.teamId) : null
      const holes = Array.isArray(body && body.holes) ? body.holes : null
      if (!eventId || !teamId || !holes || holes.length !== 18) {
        return new Response('Missing id, teamId, or 18 holes', { status: 400 })
      }
      const existing = await getDoc(COL.scrambleEvents, leagueId, eventId)
      if (!existing) return new Response('Event not found', { status: 404 })
      const scores = existing.scores && typeof existing.scores === 'object' ? existing.scores : {}
      scores[teamId] = {
        holes: holes.map(h => (h === '' || h === null || h === undefined) ? null : Number(h)),
        submittedAt: new Date().toISOString()
      }
      const updated = { ...existing, scores, updatedAt: new Date().toISOString() }
      await setDoc(COL.scrambleEvents, leagueId, eventId, updated)
      return Response.json({ success: true, event: updated })
    }

    return new Response('Invalid action', { status: 400 })
  }

  if (req.method === 'GET') {
    if (id) {
      const event = await getDoc(COL.scrambleEvents, leagueId, id)
      if (!event) return new Response('Not found', { status: 404 })
      return Response.json({ event })
    }
    const docs = await listDocs(COL.scrambleEvents, leagueId)
    const events = docs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    return Response.json({ events })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/scramble-events' }
