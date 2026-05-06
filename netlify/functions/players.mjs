import { requireAdmin, requireAdminOrScorer } from './_auth.mjs'
import { db, COL, lid, listDocs, getDoc, setDoc, deleteDoc } from './_firebase.mjs'

function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function pNumFin(v) { const n = v !== undefined && v !== null ? parseFloat(v) : NaN; return Number.isFinite(n) ? n : null }
function parseBool(v, fb) { return v !== undefined ? Boolean(v) : fb }
function parseOptional(val, fallback) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? parseFloat(val) : fallback
}

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const includeRoles = url.searchParams.get('includeRoles') === '1'
    const docs = await listDocs(COL.players, leagueId)
    const players = []
    for (const data of docs) {
      if (!data.email) continue
      const p = {
        name:  data.name  || '',
        email: normalizeEmail(data.email),
        phone: data.phone || '',
        handicap:           pNumFin(data.handicap),
        hdcp9:              pNumFin(data.hdcp9),
        hdcp18:             pNumFin(data.hdcp18),
        hcpFront9:          pNumFin(data.hcpFront9),
        hcpBack9:           pNumFin(data.hcpBack9),
        hcp18:              pNumFin(data.hcp18),
        hcpFront9Override:      Boolean(data.hcpFront9Override),
        hcpFront9OverrideValue: pNumFin(data.hcpFront9OverrideValue),
        hcpBack9Override:       Boolean(data.hcpBack9Override),
        hcpBack9OverrideValue:  pNumFin(data.hcpBack9OverrideValue),
        hcp18Override:          Boolean(data.hcp18Override),
        hcp18OverrideValue:     pNumFin(data.hcp18OverrideValue),
        updatedAt: data.updatedAt || null,
        createdAt: data.createdAt || null
      }
      if (includeRoles) {
        const userSnap = await db.collection(COL.users).doc(p.email).get()
        p.role = (userSnap.exists && userSnap.data().role) || 'player'
      }
      players.push(p)
    }
    players.sort((a, b) => String(a.name).localeCompare(String(b.name)))
    return Response.json({ players })
  }

  if (req.method === 'POST') {
    const authErr = await requireAdminOrScorer(req)
    if (authErr) return authErr
    const body  = await req.json().catch(() => null)
    const email = normalizeEmail(body && body.email)
    const name  = body && body.name ? String(body.name).trim() : ''
    if (!email || !name) return new Response('Missing name or email', { status: 400 })

    const existing = await getDoc(COL.players, leagueId, email)

    const hcpFront9Override      = parseBool(body.hcpFront9Override,      !!(existing && existing.hcpFront9Override))
    const hcpBack9Override       = parseBool(body.hcpBack9Override,       !!(existing && existing.hcpBack9Override))
    const hcp18Override          = parseBool(body.hcp18Override,          !!(existing && existing.hcp18Override))
    const hcpFront9OverrideValue = parseOptional(body.hcpFront9OverrideValue, (existing && existing.hcpFront9OverrideValue) ?? null)
    const hcpBack9OverrideValue  = parseOptional(body.hcpBack9OverrideValue,  (existing && existing.hcpBack9OverrideValue)  ?? null)
    const hcp18OverrideValue     = parseOptional(body.hcp18OverrideValue,     (existing && existing.hcp18OverrideValue)     ?? null)

    const updated = {
      ...(existing || {}),
      name, email,
      phone:    body.phone    ? String(body.phone).trim()   : (existing && existing.phone)  || '',
      handicap: parseOptional(body.handicap, (existing && existing.handicap) ?? null),
      hdcp9:    parseOptional(body.hdcp9,    (existing && existing.hdcp9)    ?? null),
      hdcp18:   parseOptional(body.hdcp18,   (existing && existing.hdcp18)   ?? null),
      hcpFront9Override,
      hcpFront9OverrideValue: hcpFront9Override ? hcpFront9OverrideValue : null,
      hcpBack9Override,
      hcpBack9OverrideValue:  hcpBack9Override  ? hcpBack9OverrideValue  : null,
      hcp18Override,
      hcp18OverrideValue:     hcp18Override     ? hcp18OverrideValue     : null,
      updatedAt: new Date().toISOString(),
      createdAt: (existing && existing.createdAt) || new Date().toISOString()
    }
    delete updated.leagueId  // setDoc adds it

    await setDoc(COL.players, leagueId, email, updated)
    return Response.json({ success: true, player: updated })
  }

  if (req.method === 'DELETE') {
    const authErr = await requireAdmin(req)
    if (authErr) return authErr
    const email = normalizeEmail(url.searchParams.get('email'))
    if (!email) return new Response('Missing email', { status: 400 })
    await deleteDoc(COL.players, leagueId, email)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/players' }
