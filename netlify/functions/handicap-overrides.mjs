import { db, COL, lid, listDocs, getDoc, setDoc, deleteDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
function asNum(v) { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) ? n : null }

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const email = normalizeEmail(url.searchParams.get('email'))
    if (email) {
      const cur = await getDoc(COL.handicapOverrides, leagueId, email)
      return Response.json({ override: cur || null })
    }
    const docs = await listDocs(COL.handicapOverrides, leagueId)
    docs.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
    return Response.json({ overrides: docs })
  }

  if (req.method === 'POST') {
    const body   = await req.json().catch(() => null)
    const action = String((body && body.action) || '').toLowerCase()
    const email  = normalizeEmail(body && body.email)
    if (!email) return new Response('Missing email', { status: 400 })

    if (action === 'clear') {
      await deleteDoc(COL.handicapOverrides, leagueId, email)
      return Response.json({ success: true })
    }

    const value = asNum(body && body.value)
    if (value === null) return new Response('Missing value', { status: 400 })
    const record = { email, value, note: body.note ? String(body.note).trim() : '', setBy: body.setBy ? String(body.setBy) : null, setAt: new Date().toISOString() }
    await setDoc(COL.handicapOverrides, leagueId, email, record)
    return Response.json({ success: true, override: record })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/handicap-overrides' }
