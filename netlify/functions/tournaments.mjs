import { getStore } from '@netlify/blobs'

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function normalizeEventId(v) {
  const s = String(v || '').trim()
  return s || null
}

function normalizeScoringType(v) {
  const s = String(v || '').toLowerCase()
  const allowed = ['stroke_gross', 'stroke_net', 'stableford', 'best_ball']
  return allowed.includes(s) ? s : 'stroke_gross'
}

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase()
}

async function listEvents(store) {
  const { blobs } = await store.list().catch(() => ({ blobs: [] }))
  const events = []
  for (const blob of blobs || []) {
    const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
    if (data) events.push(data)
  }
  events.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  return events
}

export default async (req) => {
  const store = getStore('tournaments')
  const url = new URL(req.url)
  const id = normalizeEventId(url.searchParams.get('id'))
  const action = (url.searchParams.get('action') || '').toLowerCase()

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)

    if (action === 'create') {
      const week = asInt(body && body.week)
      const date = body && body.date ? String(body.date) : null
      const name = body && body.name ? String(body.name) : 'Tournament'
      const course = body && body.course ? String(body.course) : ''
      const teeTime = body && body.teeTime ? String(body.teeTime) : ''
      const scoringType = normalizeScoringType(body && body.scoringType)
      const createdAt = new Date().toISOString()

      if (!date) {
        return new Response('Missing date', { status: 400 })
      }

      const eventId = `tournament-${Date.now()}`
      const event = {
        id: eventId,
        week: week || null,
        name,
        date,
        course,
        teeTime,
        scoringType,
        notes: body && body.notes ? String(body.notes) : '',
        scores: {},
        createdAt,
        updatedAt: createdAt
      }

      await store.setJSON(eventId, event)
      return Response.json({ success: true, event })
    }

    if (action === 'submit_score') {
      const eventId = normalizeEventId(body && body.id)
      const playerEmail = normalizeEmail(body && body.playerEmail)
      const holes = Array.isArray(body && body.holes) ? body.holes : null
      if (!eventId || !playerEmail || !holes || holes.length !== 18) {
        return new Response('Missing id, playerEmail, or 18 holes', { status: 400 })
      }
      const existing = await store.get(eventId, { type: 'json' }).catch(() => null)
      if (!existing) {
        return new Response('Event not found', { status: 404 })
      }

      const scores = existing.scores && typeof existing.scores === 'object' ? existing.scores : {}
      scores[playerEmail] = {
        holes: holes.map(h => (h === '' || h === null || h === undefined) ? null : Number(h)),
        submittedAt: new Date().toISOString()
      }

      const updated = { ...existing, scores, updatedAt: new Date().toISOString() }
      await store.setJSON(eventId, updated)
      return Response.json({ success: true, event: updated })
    }

    if (action === 'update') {
      const eventId = normalizeEventId(body && body.id)
      if (!eventId) return new Response('Missing id', { status: 400 })
      const existing = await store.get(eventId, { type: 'json' }).catch(() => null)
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

      await store.setJSON(eventId, updated)
      return Response.json({ success: true, event: updated })
    }

    return new Response('Invalid action', { status: 400 })
  }

  if (req.method === 'GET') {
    if (id) {
      const event = await store.get(id, { type: 'json' }).catch(() => null)
      if (!event) return new Response('Not found', { status: 404 })
      return Response.json({ event })
    }
    const events = await listEvents(store)
    return Response.json({ events })
  }

  if (req.method === 'DELETE') {
    if (!id) return new Response('Missing id', { status: 400 })
    await store.delete(id).catch(() => null)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/tournaments'
}
