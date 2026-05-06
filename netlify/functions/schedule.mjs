import { requireAdmin } from './_auth.mjs'
import { db, COL, lid, listDocs, getDoc, setDoc, deleteDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function isoDateOrNull(v) {
  const s = v ? String(v).trim() : ''; if (!s) return null
  const ts = Date.parse(s); if (!ts || isNaN(ts)) return null
  return new Date(ts).toISOString().slice(0, 10)
}
function normalizeSide(v) { const s = String(v || '').trim().toLowerCase(); return ['front','back','both'].includes(s) ? s : null }
function sanitizeMatches(matches) {
  const list = Array.isArray(matches) ? matches : []; const out = []; const used = new Set()
  for (const m of list) {
    const a = asInt(m && m.teamA); const b = asInt(m && m.teamB)
    if (!a || !b || a < 1 || b < 1 || a === b || used.has(a) || used.has(b)) continue
    used.add(a); used.add(b); out.push({ teamA: a, teamB: b })
  }
  return out
}
function addDays(iso, days) {
  const ts = Date.parse(iso); if (!ts || isNaN(ts)) return iso
  const d = new Date(ts); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10)
}

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })
  const action = (url.searchParams.get('action') || '').toLowerCase()

  if (req.method === 'POST') {
    const authErr = await requireAdmin(req)
    if (authErr) return authErr
    const body = await req.json().catch(() => null)

    if (action === 'propose_rainout') {
      const week = asInt(body && body.week)
      const rescheduledDate = isoDateOrNull(body && body.rescheduledDate)
      const reason = body && body.reason ? String(body.reason) : ''
      if (!week || !rescheduledDate) return new Response('Missing week or rescheduledDate', { status: 400 })

      const weekDocs = await listDocs(COL.schedule, leagueId)
      weekDocs.sort((a, b) => (a.week || 0) - (b.week || 0))
      const hit = weekDocs.find(w => (w.week || 0) === week)
      if (!hit || !hit.date) return new Response('Week not found', { status: 400 })

      const originalDate = isoDateOrNull(hit.date)
      const deltaDays = Math.round((Date.parse(rescheduledDate) - Date.parse(originalDate)) / 86400000)
      if (!Number.isFinite(deltaDays)) return new Response('Invalid date', { status: 400 })

      const proposedWeeks = weekDocs.map(w => {
        if (!w || !w.week || w.week < week) return w
        return { ...w, date: addDays(isoDateOrNull(w.date) || w.date, deltaDays), adjustedFrom: w.date }
      })

      const proposal = {
        id: `proposal-${Date.now()}`, type: 'rainout_shift', week, originalDate,
        rescheduledDate, deltaDays, reason, status: 'pending',
        proposedWeeks, createdAt: new Date().toISOString()
      }

      await setDoc(COL.scheduleProposals, leagueId, 'pending', proposal)
      await setDoc(COL.rainouts, leagueId, `week-${week}`, {
        week, originalDate, reason, rescheduledDate, status: 'pending', markedAt: new Date().toISOString()
      })
      return Response.json({ success: true, proposal })
    }

    if (action === 'apply_proposal') {
      const proposal = await getDoc(COL.scheduleProposals, leagueId, 'pending')
      if (!proposal || proposal.status !== 'pending') return new Response('No pending proposal', { status: 400 })

      for (const w of (proposal.proposedWeeks || [])) {
        if (!w || !w.week) continue
        const existing = await getDoc(COL.schedule, leagueId, `week-${w.week}`) || {}
        await setDoc(COL.schedule, leagueId, `week-${w.week}`, { ...existing, ...w, updatedAt: new Date().toISOString() })
      }
      await deleteDoc(COL.scheduleProposals, leagueId, 'pending')
      const rain = await getDoc(COL.rainouts, leagueId, `week-${proposal.week}`)
      if (rain) await setDoc(COL.rainouts, leagueId, `week-${proposal.week}`, { ...rain, status: 'approved', approvedAt: new Date().toISOString() })
      return Response.json({ success: true })
    }

    if (action === 'reject_proposal') {
      const proposal = await getDoc(COL.scheduleProposals, leagueId, 'pending')
      if (proposal) {
        await deleteDoc(COL.scheduleProposals, leagueId, 'pending')
        const rain = await getDoc(COL.rainouts, leagueId, `week-${proposal.week}`)
        if (rain) await setDoc(COL.rainouts, leagueId, `week-${proposal.week}`, { ...rain, status: 'rejected', rejectedAt: new Date().toISOString() })
      }
      return Response.json({ success: true })
    }

    const week = asInt(body && body.week)
    if (!week) return new Response('Missing week', { status: 400 })
    const existing = await getDoc(COL.schedule, leagueId, `week-${week}`) || {}
    const side = normalizeSide(body && body.side)
    const updated = {
      ...existing, ...body, week,
      date: isoDateOrNull(body && body.date) || (existing && existing.date) || null,
      side: side || (existing && existing.side) || null,
      matches: sanitizeMatches(body && body.matches),
      updatedAt: new Date().toISOString()
    }
    delete updated.leagueId
    await setDoc(COL.schedule, leagueId, `week-${week}`, updated)
    return Response.json({ success: true, week: updated })
  }

  if (req.method === 'DELETE') {
    const authErr = await requireAdmin(req)
    if (authErr) return authErr
    const week = asInt(url.searchParams.get('week'))
    if (!week) return new Response('Missing week', { status: 400 })
    await deleteDoc(COL.schedule, leagueId, `week-${week}`)
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const weekDocs = await listDocs(COL.schedule, leagueId)
    weekDocs.sort((a, b) => (a.week || 0) - (b.week || 0))
    const rainouts = await listDocs(COL.rainouts, leagueId)
    const pendingProposal = await getDoc(COL.scheduleProposals, leagueId, 'pending')
    return Response.json({ weeks: weekDocs, rainouts, pendingProposal })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/schedule' }
