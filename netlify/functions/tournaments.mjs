import { db, COL, lid, listDocs, getDoc, setDoc, deleteDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function normalizeScoringType(v) { const s = String(v || '').toLowerCase(); const a = ['stroke_gross','stroke_net','stableford','best_ball']; return a.includes(s) ? s : 'stroke_gross' }
function normalizeEventId(v) { const s = String(v || '').trim(); return s || null }
function normalizeEmail(v) { return String(v || '').trim().toLowerCase() }

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
      const eventId = `tournament-${Date.now()}`
      const createdAt = new Date().toISOString()
      const event = {
        id: eventId,
        week: asInt(body && body.week) || null,
        name: body && body.name ? String(body.name) : 'Tournament',
        date, course: body && body.course ? String(body.course) : '',
        teeTime: body && body.teeTime ? String(body.teeTime) : '',
        scoringType: normalizeScoringType(body && body.scoringType),
        notes: body && body.notes ? String(body.notes) : '',
        scores: {}, createdAt, updatedAt: createdAt
      }
      await setDoc(COL.tournaments, leagueId, eventId, event)
      return Response.json({ success: true, event })
    }

    if (action === 'submit_score') {
      const eventId = normalizeEventId(body && body.id)
      const playerEmail = normalizeEmail(body && body.playerEmail)
      const holes = Array.isArray(body && body.holes) ? body.holes : null
      if (!eventId || !playerEmail || !holes || holes.length !== 18) {
        return new Response('Missing id, playerEmail, or 18 holes', { status: 400 })
      }
      const existing = await getDoc(COL.tournaments, leagueId, eventId)
      if (!existing) return new Response('Event not found', { status: 404 })
      const scores = existing.scores && typeof existing.scores === 'object' ? existing.scores : {}
      scores[playerEmail] = {
        holes: holes.map(h => (h === '' || h === null || h === undefined) ? null : Number(h)),
        submittedAt: new Date().toISOString()
      }
      const updated = { ...existing, scores, updatedAt: new Date().toISOString() }
      await setDoc(COL.tournaments, leagueId, eventId, updated)
      return Response.json({ success: true, event: updated })
    }

    if (action === 'update') {
      const eventId = normalizeEventId(body && body.id)
      if (!eventId) return new Response('Missing id', { status: 400 })
      const existing = await getDoc(COL.tournaments, leagueId, eventId)
      if (!existing) return new Response('Event not found', { status: 404 })
      const updated = {
        ...existing,
        name: body && body.name ? String(body.name) : existing.name,
        date: body && body.date ? String(body.date) : existing.date,
        week: body && body.week !== undefined ? (asInt(body.week) || null) : existing.week,
        course: body && body.course !== undefined ? String(body.course || '') : existing.course,
        teeTime: body && body.teeTime !== undefined ? String(body.teeTime || '') : existing.teeTime,
        scoringType: body && body.scoringType ? normalizeScoringType(body.scoringType) : existing.scoringType,
        notes: body && body.notes !== undefined ? String(body.notes || '') : existing.notes,
        updatedAt: new Date().toISOString()
      }
      await setDoc(COL.tournaments, leagueId, eventId, updated)
      return Response.json({ success: true, event: updated })
    }

    return new Response('Invalid action', { status: 400 })
  }

  if (req.method === 'GET') {
    if (id) {
      const event = await getDoc(COL.tournaments, leagueId, id)
      if (!event) return new Response('Not found', { status: 404 })
      return Response.json({ event })
    }
    const docs = await listDocs(COL.tournaments, leagueId)
    const events = docs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    return Response.json({ events })
  }

  if (req.method === 'DELETE') {
    if (!id) return new Response('Missing id', { status: 400 })
    await deleteDoc(COL.tournaments, leagueId, id)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/tournaments' }
