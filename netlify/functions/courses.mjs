import { getStore } from '@netlify/blobs'
import { requireAdmin } from './_auth.mjs'

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function leagueStoreName(base, leagueId) {
  const id = normalizeLeagueId(leagueId)
  return id ? `${base}-${id}` : base
}

function normalizeId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function sanitizeHoles(holes) {
  const list = Array.isArray(holes) ? holes : []
  const out = []
  for (let i = 0; i < 18; i++) {
    const h = list[i] || {}
    out.push({
      hole: i + 1,
      par: asInt(h.par) || 4,
      hcpIndex: asInt(h.hcpIndex) || (i + 1)
    })
  }
  return out
}

function sanitizeTees(tees) {
  const list = Array.isArray(tees) ? tees : []
  const out = []
  for (const t of list.slice(0, 4)) {
    if (!t) continue
    const name = String(t.name || '').trim()
    if (!name) continue
    const yards = Array.isArray(t.yards) ? t.yards : []
    const fixedYards = []
    for (let i = 0; i < 18; i++) {
      fixedYards.push(asInt(yards[i]) || 0)
    }
    out.push({
      name,
      yards: fixedYards
    })
  }
  return out
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('courses', leagueId))

  if (req.method === 'GET') {
    const id = normalizeId(url.searchParams.get('id'))
    if (id) {
      const course = await store.get(`course-${id}`, { type: 'json' }).catch(() => null)
      if (!course) return new Response('Not found', { status: 404 })
      return Response.json({ course })
    }

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const courses = []
    for (const blob of blobs || []) {
      if (!String(blob.key || '').startsWith('course-')) continue
      const c = await store.get(blob.key, { type: 'json' }).catch(() => null)
      if (c) courses.push(c)
    }
    courses.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    return Response.json({ courses })
  }

  if (req.method === 'POST') {
    const authErr = requireAdmin(req)
    if (authErr) return authErr
    const body = await req.json().catch(() => null)
    const name = body && body.name ? String(body.name).trim() : ''
    if (!name) return new Response('Missing name', { status: 400 })

    const id = normalizeId(body && body.id ? body.id : name)
    if (!id) return new Response('Invalid id', { status: 400 })

    const lat = body && body.lat !== undefined && body.lat !== null && String(body.lat).trim() !== '' ? parseFloat(body.lat) : null
    const lon = body && body.lon !== undefined && body.lon !== null && String(body.lon).trim() !== '' ? parseFloat(body.lon) : null
    const course = {
      id,
      name,
      address: body && body.address ? String(body.address).trim() : '',
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      tees: sanitizeTees(body && body.tees),
      holes: sanitizeHoles(body && body.holes),
      updatedAt: new Date().toISOString()
    }

    await store.setJSON(`course-${id}`, course)
    return Response.json({ success: true, course })
  }

  if (req.method === 'DELETE') {
    const authErr = requireAdmin(req)
    if (authErr) return authErr
    const id = normalizeId(url.searchParams.get('id'))
    if (!id) return new Response('Missing id', { status: 400 })
    await store.delete(`course-${id}`).catch(() => null)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/courses'
}
