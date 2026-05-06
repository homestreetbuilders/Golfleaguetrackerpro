import { db, COL, lid, listDocs, getDoc, setDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function normalizeEmail(v) { return String(v || '').trim().toLowerCase() }
function normalizeName(v) { return String(v || '').trim() }

function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

function suggestGroups(players) {
  const list = (players || []).slice()
  list.sort((a, b) => {
    const ha = Number.isFinite(a.handicap) ? a.handicap : 999
    const hb = Number.isFinite(b.handicap) ? b.handicap : 999
    if (ha !== hb) return ha - hb
    return String(a.name).localeCompare(String(b.name))
  })
  const snake = []
  let i = 0, j = list.length - 1
  while (i <= j) {
    if (i === j) { snake.push(list[i]); break }
    snake.push(list[i]); snake.push(list[j]); i++; j--
  }
  const groups = chunk(snake, 4)
    .filter(g => g.length >= 2)
    .map((g, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      players: g.map(p => ({ name: p.name, email: p.email || null }))
    }))
  return { groups, rationale: 'Scaffold AI: players sorted by handicap then snake-drafted into groups of 4 to balance strengths.' }
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })
  const action = (url.searchParams.get('action') || '').toLowerCase()

  if (req.method === 'GET') {
    const week = asInt(url.searchParams.get('week'))
    if (!week) return new Response('Missing week', { status: 400 })
    const rec = await getDoc(COL.aiPairings, leagueId, `suggest-${week}`)
    return Response.json({ suggestion: rec || null })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const week = asInt(body && body.week)
    if (!week) return new Response('Missing week', { status: 400 })
    if (action !== 'suggest') return new Response('Invalid action', { status: 400 })

    const playerDocs = await listDocs(COL.players, leagueId)
    const players = playerDocs
      .filter(p => p && p.name)
      .map(p => ({
        name: normalizeName(p.name),
        email: p.email ? normalizeEmail(p.email) : null,
        handicap: typeof p.handicap === 'number' ? p.handicap : (p.handicap ? Number(p.handicap) : null)
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))

    const { groups, rationale } = suggestGroups(players)
    const suggestion = {
      week, groups, rationale,
      createdAt: new Date().toISOString(),
      createdBy: body && body.createdBy ? String(body.createdBy) : null
    }

    await setDoc(COL.aiPairings, leagueId, `suggest-${week}`, suggestion)
    return Response.json({ success: true, suggestion })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/ai-pairing' }
