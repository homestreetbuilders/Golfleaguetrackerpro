import { db, COL, lid, listDocs, getDoc, setDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function normalizeEmail(v) { return String(v || '').trim().toLowerCase() }
function normalizeName(v) { return String(v || '').trim() }

function sanitizeGroups(groups) {
  const list = Array.isArray(groups) ? groups : []; const out = []
  for (const g of list) {
    if (!g) continue
    const players = Array.isArray(g.players) ? g.players : []
    const cleaned = players
      .map(p => typeof p === 'string' ? { name: p } : p)
      .map(p => ({ name: normalizeName(p && p.name), email: p && p.email ? normalizeEmail(p.email) : null }))
      .filter(p => p.name)
    if (cleaned.length < 2) continue
    out.push({ id: g.id ? String(g.id) : `g-${Date.now()}-${out.length}`, players: cleaned.slice(0, 4) })
  }
  return out
}

function autoPair(players) {
  const list = (Array.isArray(players) ? players.slice() : []).sort((a, b) => {
    const ha = typeof a.handicap === 'number' ? a.handicap : 999
    const hb = typeof b.handicap === 'number' ? b.handicap : 999
    return ha !== hb ? ha - hb : String(a.name).localeCompare(String(b.name))
  })
  const groups = []
  for (let i = 0; i < list.length; i += 4) {
    const chunk = list.slice(i, i + 4)
    if (chunk.length >= 2) groups.push({ id: `auto-${Date.now()}-${groups.length}`, players: chunk.map(p => ({ name: p.name, email: p.email || null })) })
  }
  return groups
}

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  const week     = asInt(url.searchParams.get('week'))

  if (req.method === 'GET') {
    if (week) {
      const p = await getDoc(COL.pairings, leagueId, `week-${week}`)
      return Response.json({ pairing: p || null })
    }
    const docs = await listDocs(COL.pairings, leagueId)
    docs.sort((a, b) => (a.week || 0) - (b.week || 0))
    return Response.json({ pairings: docs })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const action = String((body && body.action) || '').toLowerCase()
    const w = asInt(body && body.week)
    if (!w) return new Response('Missing week', { status: 400 })

    if (action === 'auto') {
      const playerDocs = await listDocs(COL.players, leagueId)
      const players = playerDocs
        .filter(p => p && p.name)
        .map(p => ({ name: normalizeName(p.name), email: p.email ? normalizeEmail(p.email) : null, handicap: p.handicap }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      const groups = autoPair(players)
      const record = { week: w, groups, updatedAt: new Date().toISOString(), updatedBy: body.updatedBy || null, mode: 'auto' }
      await setDoc(COL.pairings, leagueId, `week-${w}`, record)
      return Response.json({ success: true, pairing: record })
    }

    const groups = sanitizeGroups(body && body.groups)
    const record = { week: w, groups, updatedAt: new Date().toISOString(), updatedBy: body.updatedBy || null, mode: 'manual' }
    await setDoc(COL.pairings, leagueId, `week-${w}`, record)
    return Response.json({ success: true, pairing: record })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/pairings' }
