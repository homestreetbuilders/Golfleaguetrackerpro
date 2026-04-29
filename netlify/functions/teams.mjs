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

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase()
}

function sanitizeTeam(raw) {
  const teamNumber = asInt(raw && raw.teamNumber)
  const player1Email = normalizeEmail(raw && raw.player1Email)
  const player2Email = normalizeEmail(raw && raw.player2Email)
  const teamName = raw && raw.teamName ? String(raw.teamName).trim() : ''

  if (!teamNumber || teamNumber < 1) return null
  if (!player1Email || !player2Email) return null
  if (player1Email === player2Email) return null

  return { teamNumber, teamName, player1Email, player2Email }
}

async function listTeams(store) {
  const { blobs } = await store.list().catch(() => ({ blobs: [] }))
  const teams = []
  for (const blob of blobs || []) {
    if (!blob || !blob.key || !String(blob.key).startsWith('team-')) continue
    const t = await store.get(blob.key, { type: 'json' }).catch(() => null)
    if (!t || !t.teamNumber) continue
    teams.push(t)
  }
  teams.sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0))
  return teams
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('teams', leagueId))

  if (req.method === 'GET') {
    const teams = await listTeams(store)
    return Response.json({ teams })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const list = Array.isArray(body && body.teams) ? body.teams : null
    const single = !list && body && (body.teamNumber || body.player1Email || body.player2Email) ? [body] : null
    const input = list || single || []

    const teams = input.map(sanitizeTeam).filter(Boolean)
    if (!teams.length) {
      return new Response('Missing or invalid teams', { status: 400 })
    }

    const used = new Set()
    for (const t of teams) {
      if (used.has(t.player1Email) || used.has(t.player2Email)) {
        return new Response('A player may only be on one team', { status: 400 })
      }
      used.add(t.player1Email)
      used.add(t.player2Email)
    }

    for (const t of teams) {
      await store.setJSON(`team-${t.teamNumber}`, { ...t, updatedAt: new Date().toISOString() })
    }

    const updated = await listTeams(store)
    return Response.json({ success: true, teams: updated })
  }

  if (req.method === 'DELETE') {
    const teamNumber = asInt(url.searchParams.get('teamNumber'))
    if (!teamNumber) return new Response('Missing teamNumber', { status: 400 })
    await store.delete(`team-${teamNumber}`).catch(() => null)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/teams'
}
