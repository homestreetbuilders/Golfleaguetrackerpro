import { requireAdmin } from './_auth.mjs'
import { COL, listDocs, getDoc, setDoc, deleteDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function asNum(v) { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? n : null }
function parseRatingField(body, key) { const v = body && body[key]; if (v == null || String(v).trim() === '') return null; return asNum(v) }

function sanitizeHoles(holes) {
  const list = Array.isArray(holes) ? holes : []; const out = []
  for (let i = 0; i < 18; i++) { const h = list[i] || {}; out.push({ hole: i + 1, par: asInt(h.par) || 4, hcpIndex: asInt(h.hcpIndex) || (i + 1) }) }
  return out
}
function sanitizeTees(tees) {
  const list = Array.isArray(tees) ? tees : []; const out = []
  for (const t of list.slice(0, 4)) {
    if (!t) continue; const name = String(t.name || '').trim(); if (!name) continue
    const yards = Array.isArray(t.yards) ? t.yards : []
    const fixedYards = []; for (let i = 0; i < 18; i++) fixedYards.push(asInt(yards[i]) || 0)
    out.push({ name, yards: fixedYards })
  }
  return out
}

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))

  if (req.method === 'GET') {
    const id = normalizeId(url.searchParams.get('id'))
    if (id) {
      const course = await getDoc(COL.courses, leagueId, id)
      if (!course) return new Response('Not found', { status: 404 })
      return Response.json({ course })
    }
    const docs = await listDocs(COL.courses, leagueId)
    docs.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    return Response.json({ courses: docs })
  }

  if (req.method === 'POST') {
    const authErr = await requireAdmin(req)
    if (authErr) return authErr
    const body = await req.json().catch(() => null)
    const name = body && body.name ? String(body.name).trim() : ''
    if (!name) return new Response('Missing name', { status: 400 })
    const id = normalizeId(body && body.id ? body.id : name)
    if (!id) return new Response('Invalid id', { status: 400 })

    const lat = body.lat != null && String(body.lat).trim() !== '' ? parseFloat(body.lat) : null
    const lon = body.lon != null && String(body.lon).trim() !== '' ? parseFloat(body.lon) : null
    const course = {
      id, name,
      address: body.address ? String(body.address).trim() : '',
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      tees: sanitizeTees(body.tees), holes: sanitizeHoles(body.holes),
      frontPar: parseRatingField(body, 'frontPar'), frontRating: parseRatingField(body, 'frontRating'), frontSlope: parseRatingField(body, 'frontSlope'),
      backPar:  parseRatingField(body, 'backPar'),  backRating:  parseRatingField(body, 'backRating'),  backSlope:  parseRatingField(body, 'backSlope'),
      fullPar:  parseRatingField(body, 'fullPar'),  fullRating:  parseRatingField(body, 'fullRating'),  fullSlope:  parseRatingField(body, 'fullSlope'),
      updatedAt: new Date().toISOString()
    }
    await setDoc(COL.courses, leagueId, id, course)
    return Response.json({ success: true, course })
  }

  if (req.method === 'DELETE') {
    const authErr = await requireAdmin(req)
    if (authErr) return authErr
    const id = normalizeId(url.searchParams.get('id'))
    if (!id) return new Response('Missing id', { status: 400 })
    await deleteDoc(COL.courses, leagueId, id)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/courses' }
