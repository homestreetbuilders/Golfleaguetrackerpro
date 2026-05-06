import { db, COL, lid, listDocs, getDoc, setDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function isoDateOrNull(v) { const s = v ? String(v).trim() : ''; if (!s) return null; const ts = Date.parse(s); if (!ts || isNaN(ts)) return null; return new Date(ts).toISOString().slice(0, 10) }
function normalizeSide(v) { const s = String(v || '').trim().toLowerCase(); if (s === 'front' || s === 'back' || s === 'both') return s; return null }
function normalizeEmail(v) { return String(v || '').trim().toLowerCase() }

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
    const holesComplete = !!(holes && holes.length === 9 && holes.every(v => typeof v === 'number' && Number.isFinite(v)))
    const grossTotal = typeof p.grossTotal === 'number'
      ? p.grossTotal
      : (holesComplete ? holes.reduce((a, b) => a + (Number(b) || 0), 0) : null)
    const handicapSnapshot = typeof p.handicapSnapshot === 'number' && Number.isFinite(p.handicapSnapshot)
      ? p.handicapSnapshot : null
    out.push({ email, name, holes, grossTotal: typeof grossTotal === 'number' ? grossTotal : null, handicapSnapshot })
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
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const week = asInt(url.searchParams.get('week'))
    const teamA = asInt(url.searchParams.get('teamA'))
    const teamB = asInt(url.searchParams.get('teamB'))

    if (week && teamA && teamB) {
      const key = matchKey(week, teamA, teamB)
      const scorecard = await getDoc(COL.matchScorecards, leagueId, key)
      return Response.json({ scorecard: scorecard || null })
    }

    const docs = await listDocs(COL.matchScorecards, leagueId)

    if (week) {
      const scorecards = docs
        .filter(d => d.week === week)
        .sort((a, b) => String(a.key || '').localeCompare(String(b.key || '')))
      return Response.json({ scorecards })
    }

    return Response.json({ keys: docs.map(d => d.key).filter(Boolean) })
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
    const existing = await getDoc(COL.matchScorecards, leagueId, key)

    if (action === 'unlock') {
      if (!existing) return new Response('Match scorecard not found', { status: 404 })
      const updated = {
        ...existing,
        status: 'draft',
        unlockedAt: new Date().toISOString(),
        unlockedBy: body && body.submittedBy ? String(body.submittedBy) : null
      }
      await setDoc(COL.matchScorecards, leagueId, key, updated)

      // Release individual score locks
      if (Array.isArray(existing.players)) {
        const unlockData = { locked: false, updatedAt: updated.unlockedAt, reason: 'match_unlock' }
        const writes = []
        for (const p of existing.players) {
          if (!p) continue
          if (p.name) {
            const nameLockId = `lock-${String(p.name).toLowerCase()}-week-${week}`
            writes.push(db.collection(COL.scorecardLocks).doc(lid(leagueId, nameLockId)).set({ leagueId, ...unlockData }))
          }
          if (p.email) {
            const emailLockId = `lock-email-${String(p.email).toLowerCase()}-week-${week}`
            writes.push(db.collection(COL.scorecardLocks).doc(lid(leagueId, emailLockId)).set({ leagueId, ...unlockData }))
          }
        }
        await Promise.all(writes.map(p => p.catch(() => null)))
      }

      return Response.json({ success: true, scorecard: updated, unlocked: true })
    }

    if (existing && existing.status === 'final') {
      return new Response('Match scorecard locked', { status: 423 })
    }

    const parTotal = body && typeof body.parTotal === 'number' && Number.isFinite(body.parTotal)
      ? body.parTotal : 36

    const updated = {
      key, week, teamA, teamB,
      date: isoDateOrNull(body && body.date),
      course: body && body.course ? String(body.course) : null,
      tee: body && body.tee ? String(body.tee) : null,
      side: normalizeSide(body && body.side) || 'front',
      players: sanitizePlayers(body && body.players),
      parTotal,
      status: body && body.status === 'final' ? 'final' : 'draft',
      submittedBy: body && body.submittedBy ? String(body.submittedBy) : null,
      submittedAt: new Date().toISOString()
    }

    await setDoc(COL.matchScorecards, leagueId, key, updated)
    return Response.json({ success: true, scorecard: updated })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/match-scorecards' }
