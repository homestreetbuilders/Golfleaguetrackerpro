import { getStore } from '@netlify/blobs'

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function leagueStoreName(base, leagueId) {
  const id = normalizeLeagueId(leagueId)
  return id ? `${base}-${id}` : base
}

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function isoDateOrNull(v) {
  const s = v ? String(v).trim() : ''
  if (!s) return null
  const ts = Date.parse(s)
  if (!ts || isNaN(ts)) return null
  return new Date(ts).toISOString().slice(0, 10)
}

function normalizeSide(v) {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'front' || s === 'back' || s === 'both') return s
  return null
}

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase()
}

function sanitizePlayers(list) {
  const arr = Array.isArray(list) ? list : []
  const out = []
  const used = new Set()
  for (const p of arr) {
    const email = normalizeEmail(p && p.email)
    const name = p && p.name ? String(p.name) : null
    const holesRaw = Array.isArray(p && p.holes) ? p.holes : null
    if (!email) continue
    if (used.has(email)) continue
    used.add(email)

    const holes = holesRaw && holesRaw.length === 9
      ? holesRaw.map(v => (v === '' || v === null || v === undefined ? null : Number(v)))
      : null

    const grossTotal = typeof p.grossTotal === 'number' ? p.grossTotal : (holes ? holes.reduce((a, b) => a + (Number(b) || 0), 0) : null)

    out.push({ email, name, holes, grossTotal: typeof grossTotal === 'number' ? grossTotal : null })
  }
  return out
}

function matchKey(week, teamA, teamB) {
  const a = Math.min(teamA, teamB)
  const b = Math.max(teamA, teamB)
  return `week-${week}-match-${a}-vs-${b}`
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('match-scorecards', leagueId))

  if (req.method === 'GET') {
    const week = asInt(url.searchParams.get('week'))
    const teamA = asInt(url.searchParams.get('teamA'))
    const teamB = asInt(url.searchParams.get('teamB'))

    if (week && teamA && teamB) {
      const key = matchKey(week, teamA, teamB)
      const scorecard = await store.get(key, { type: 'json' }).catch(() => null)
      return Response.json({ scorecard: scorecard || null })
    }

    if (week) {
      const { blobs } = await store.list({ prefix: `week-${week}-match-` }).catch(() => ({ blobs: [] }))
      const scorecards = []
      for (const b of blobs || []) {
        const sc = await store.get(b.key, { type: 'json' }).catch(() => null)
        if (sc) scorecards.push(sc)
      }
      scorecards.sort((a, b) => String(a.key || '').localeCompare(String(b.key || '')))
      return Response.json({ scorecards })
    }

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    return Response.json({ keys: (blobs || []).map(b => b && b.key).filter(Boolean) })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)

    const action = body && body.action ? String(body.action).trim().toLowerCase() : ''

    const week = asInt(body && body.week)
    const teamA = asInt(body && body.teamA)
    const teamB = asInt(body && body.teamB)
    if (!week || !teamA || !teamB || teamA === teamB) {
      return new Response('Missing week/teamA/teamB', { status: 400 })
    }

    const key = matchKey(week, teamA, teamB)
    const existing = await store.get(key, { type: 'json' }).catch(() => null)

    if (action === 'unlock') {
      if (!existing) {
        return new Response('Match scorecard not found', { status: 404 })
      }
      const updated = {
        ...existing,
        status: 'draft',
        unlockedAt: new Date().toISOString(),
        unlockedBy: body && body.submittedBy ? String(body.submittedBy) : null
      }
      await store.setJSON(key, updated)
      return Response.json({ success: true, scorecard: updated, unlocked: true })
    }

    if (existing && existing.status === 'final') {
      return new Response('Match scorecard locked', { status: 423 })
    }

    const updated = {
      key,
      week,
      teamA,
      teamB,
      date: isoDateOrNull(body && body.date),
      course: body && body.course ? String(body.course) : null,
      tee: body && body.tee ? String(body.tee) : null,
      side: normalizeSide(body && body.side) || 'front',
      players: sanitizePlayers(body && body.players),
      status: body && body.status === 'final' ? 'final' : 'draft',
      submittedBy: body && body.submittedBy ? String(body.submittedBy) : null,
      submittedAt: new Date().toISOString()
    }

    await store.setJSON(key, updated)
    return Response.json({ success: true, scorecard: updated })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/match-scorecards'
}
