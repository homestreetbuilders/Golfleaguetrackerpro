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

function addDays(iso, days) {
  const ts = Date.parse(iso)
  if (!ts || isNaN(ts)) return iso
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function listWeeks(store) {
  const { blobs } = await store.list().catch(() => ({ blobs: [] }))
  const weeks = []
  for (const blob of blobs || []) {
    const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
    if (data && data.week) weeks.push(data)
  }
  weeks.sort((a, b) => (a.week || 0) - (b.week || 0))
  return weeks
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('schedule', leagueId))
  const rainoutStore = getStore(leagueStoreName('rainouts', leagueId))
  const proposalStore = getStore(leagueStoreName('schedule-proposals', leagueId))

  const action = (url.searchParams.get('action') || '').toLowerCase()

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)

    if (action === 'propose_rainout') {
      const week = asInt(body && body.week)
      const reason = body && body.reason ? String(body.reason) : ''
      const rescheduledDate = isoDateOrNull(body && body.rescheduledDate)
      if (!week || !rescheduledDate) {
        return new Response('Missing week or rescheduledDate', { status: 400 })
      }

      const weeks = await listWeeks(store)
      const hit = weeks.find(w => (w.week || 0) === week)
      if (!hit || !hit.date) {
        return new Response('Week not found', { status: 400 })
      }
      const originalDate = isoDateOrNull(hit.date)

      const deltaDays = Math.round((Date.parse(rescheduledDate) - Date.parse(originalDate)) / (24 * 60 * 60 * 1000))
      if (!Number.isFinite(deltaDays)) {
        return new Response('Invalid date', { status: 400 })
      }

      const proposedWeeks = weeks.map(w => {
        if (!w || !w.week) return w
        if (w.week < week) return w
        const base = isoDateOrNull(w.date) || w.date
        return { ...w, date: addDays(base, deltaDays), adjustedFrom: w.date }
      })

      const proposal = {
        id: `proposal-${Date.now()}`,
        type: 'rainout_shift',
        week,
        originalDate,
        rescheduledDate,
        deltaDays,
        reason,
        status: 'pending',
        proposedWeeks,
        createdAt: new Date().toISOString()
      }

      await proposalStore.setJSON('pending', proposal)
      await rainoutStore.setJSON(`rainout-week-${week}`, {
        week,
        originalDate,
        reason,
        rescheduledDate,
        status: 'pending',
        markedAt: new Date().toISOString()
      })

      return Response.json({ success: true, proposal })
    }

    if (action === 'apply_proposal') {
      const proposal = await proposalStore.get('pending', { type: 'json' }).catch(() => null)
      if (!proposal || proposal.status !== 'pending') {
        return new Response('No pending proposal', { status: 400 })
      }
      const proposedWeeks = Array.isArray(proposal.proposedWeeks) ? proposal.proposedWeeks : []
      for (const w of proposedWeeks) {
        if (!w || !w.week) continue
        const key = `week-${w.week}`
        const existing = await store.get(key, { type: 'json' }).catch(() => ({}))
        const updated = { ...existing, ...w, updatedAt: new Date().toISOString() }
        await store.setJSON(key, updated)
      }

      await proposalStore.delete('pending').catch(() => null)

      const rain = await rainoutStore.get(`rainout-week-${proposal.week}`, { type: 'json' }).catch(() => null)
      if (rain) {
        await rainoutStore.setJSON(`rainout-week-${proposal.week}`, { ...rain, status: 'approved', approvedAt: new Date().toISOString() })
      }

      return Response.json({ success: true })
    }

    if (action === 'reject_proposal') {
      const proposal = await proposalStore.get('pending', { type: 'json' }).catch(() => null)
      if (!proposal) {
        return Response.json({ success: true })
      }
      await proposalStore.delete('pending').catch(() => null)
      const rain = await rainoutStore.get(`rainout-week-${proposal.week}`, { type: 'json' }).catch(() => null)
      if (rain) {
        await rainoutStore.setJSON(`rainout-week-${proposal.week}`, { ...rain, status: 'rejected', rejectedAt: new Date().toISOString() })
      }
      return Response.json({ success: true })
    }

    const week = asInt(body && body.week)
    if (!week) {
      return new Response('Missing week', { status: 400 })
    }
    const key = `week-${week}`
    const existing = await store.get(key, { type: 'json' }).catch(() => ({}))
    const updated = {
      ...existing,
      ...body,
      week,
      date: isoDateOrNull(body && body.date) || (existing && existing.date) || null,
      updatedAt: new Date().toISOString()
    }
    await store.setJSON(key, updated)
    return Response.json({ success: true, week: updated })
  }

  if (req.method === 'DELETE') {
    const week = asInt(url.searchParams.get('week'))
    if (!week) {
      return new Response('Missing week', { status: 400 })
    }
    await store.delete(`week-${week}`).catch(() => null)
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const weeks = await listWeeks(store)
    const { blobs: rainBlobs } = await rainoutStore.list().catch(() => ({ blobs: [] }))
    const rainouts = []
    for (const blob of rainBlobs || []) {
      const data = await rainoutStore.get(blob.key, { type: 'json' }).catch(() => null)
      if (data) rainouts.push(data)
    }
    const pendingProposal = await proposalStore.get('pending', { type: 'json' }).catch(() => null)
    return Response.json({ weeks, rainouts, pendingProposal })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/schedule'
}
