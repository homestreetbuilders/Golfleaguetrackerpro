import { getStore } from '@netlify/blobs'

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

function sanitizeGroups(groups) {
  const list = Array.isArray(groups) ? groups : []
  const out = []
  for (const g of list) {
    if (!g) continue
    const players = Array.isArray(g.players) ? g.players : []
    const cleaned = players
      .map(p => (typeof p === 'string' ? { name: p } : p))
      .map(p => ({ name: normalizeName(p && p.name), email: p && p.email ? normalizeEmail(p.email) : null }))
      .filter(p => p.name)
    if (cleaned.length < 2) continue
    out.push({
      id: g.id ? String(g.id) : `g-${Date.now()}-${out.length}`,
      players: cleaned.slice(0, 4)
    })
  }
  return out
}

async function getAllPlayers(playerStore) {
  const { blobs } = await playerStore.list().catch(() => ({ blobs: [] }))
  const players = []
  for (const b of blobs || []) {
    const p = await playerStore.get(b.key, { type: 'json' }).catch(() => null)
    if (!p || !p.name) continue
    players.push({ name: normalizeName(p.name), email: p.email ? normalizeEmail(p.email) : null, handicap: p.handicap })
  }
  players.sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return players
}

function autoPair(players) {
  const list = Array.isArray(players) ? players.slice() : []
  // simple stable pairing: sort by handicap then snake (fairness-ish)
  list.sort((a, b) => {
    const ha = (typeof a.handicap === 'number') ? a.handicap : 999
    const hb = (typeof b.handicap === 'number') ? b.handicap : 999
    if (ha !== hb) return ha - hb
    return String(a.name).localeCompare(String(b.name))
  })

  const groups = []
  for (let i = 0; i < list.length; i += 4) {
    const chunk = list.slice(i, i + 4)
    if (chunk.length >= 2) {
      groups.push({
        id: `auto-${Date.now()}-${groups.length}`,
        players: chunk.map(p => ({ name: p.name, email: p.email || null }))
      })
    }
  }
  return groups
}

export default async (req) => {
  const store = getStore('pairings')
  const playerStore = getStore('players')

  const url = new URL(req.url)
  const week = asInt(url.searchParams.get('week'))

  if (req.method === 'GET') {
    if (week) {
      const p = await store.get(`week-${week}`, { type: 'json' }).catch(() => null)
      return Response.json({ pairing: p || null })
    }

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const pairings = []
    for (const b of blobs || []) {
      if (!b || !b.key || !String(b.key).startsWith('week-')) continue
      const p = await store.get(b.key, { type: 'json' }).catch(() => null)
      if (p) pairings.push(p)
    }
    pairings.sort((a, b) => (a.week || 0) - (b.week || 0))
    return Response.json({ pairings })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const action = String((body && body.action) || '').toLowerCase()
    const w = asInt(body && body.week)
    if (!w) return new Response('Missing week', { status: 400 })

    if (action === 'auto') {
      const players = await getAllPlayers(playerStore)
      const groups = autoPair(players)
      const record = {
        week: w,
        groups,
        updatedAt: new Date().toISOString(),
        updatedBy: body && body.updatedBy ? String(body.updatedBy) : null,
        mode: 'auto'
      }
      await store.setJSON(`week-${w}`, record)
      return Response.json({ success: true, pairing: record })
    }

    const groups = sanitizeGroups(body && body.groups)
    const record = {
      week: w,
      groups,
      updatedAt: new Date().toISOString(),
      updatedBy: body && body.updatedBy ? String(body.updatedBy) : null,
      mode: 'manual'
    }
    await store.setJSON(`week-${w}`, record)
    return Response.json({ success: true, pairing: record })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/pairings'
}
