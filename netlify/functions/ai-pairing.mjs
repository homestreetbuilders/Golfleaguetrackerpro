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

function normalizeName(v) {
  return String(v || '').trim()
}

async function getAllPlayers(playerStore) {
  const { blobs } = await playerStore.list().catch(() => ({ blobs: [] }))
  const players = []
  for (const b of blobs || []) {
    const p = await playerStore.get(b.key, { type: 'json' }).catch(() => null)
    if (!p || !p.name) continue
    players.push({
      name: normalizeName(p.name),
      email: p.email ? normalizeEmail(p.email) : null,
      handicap: typeof p.handicap === 'number' ? p.handicap : (p.handicap ? Number(p.handicap) : null)
    })
  }
  players.sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return players
}

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function suggestGroups(players) {
  // Scaffold "AI": deterministic balancing by handicap tiers + snake to mix strengths.
  const list = (players || []).slice()
  list.sort((a, b) => {
    const ha = Number.isFinite(a.handicap) ? a.handicap : 999
    const hb = Number.isFinite(b.handicap) ? b.handicap : 999
    if (ha !== hb) return ha - hb
    return String(a.name).localeCompare(String(b.name))
  })

  // Snake: take best, worst, next best, next worst...
  const snake = []
  let i = 0
  let j = list.length - 1
  while (i <= j) {
    if (i === j) {
      snake.push(list[i])
      break
    }
    snake.push(list[i])
    snake.push(list[j])
    i++
    j--
  }

  const groups = chunk(snake, 4)
    .filter(g => g.length >= 2)
    .map((g, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      players: g.map(p => ({ name: p.name, email: p.email || null }))
    }))

  return {
    groups,
    rationale: 'Scaffold AI: players sorted by handicap then snake-drafted into groups of 4 to balance strengths.'
  }
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('ai-pairing', leagueId))
  const playerStore = getStore(leagueStoreName('players', leagueId))

  const action = (url.searchParams.get('action') || '').toLowerCase()

  if (req.method === 'GET') {
    const week = asInt(url.searchParams.get('week'))
    if (!week) return new Response('Missing week', { status: 400 })
    const rec = await store.get(`suggest-${week}`, { type: 'json' }).catch(() => null)
    return Response.json({ suggestion: rec || null })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const week = asInt(body && body.week)
    if (!week) return new Response('Missing week', { status: 400 })

    if (action !== 'suggest') {
      return new Response('Invalid action', { status: 400 })
    }

    const players = await getAllPlayers(playerStore)
    const { groups, rationale } = suggestGroups(players)

    const suggestion = {
      week,
      groups,
      rationale,
      createdAt: new Date().toISOString(),
      createdBy: body && body.createdBy ? String(body.createdBy) : null
    }

    await store.setJSON(`suggest-${week}`, suggestion)
    return Response.json({ success: true, suggestion })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/ai-pairing'
}
