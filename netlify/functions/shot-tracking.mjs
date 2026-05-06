import { db, COL } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeEmail(v) { return String(v || '').trim().toLowerCase() }
function cleanStr(v, maxLen) { const s = String(v || '').trim(); return s.length > maxLen ? s.slice(0, maxLen) : s }
function cleanNum(v) { const n = Number(v); return Number.isFinite(n) ? n : null }

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  const email = normalizeEmail(url.searchParams.get('email'))
  if (!email) return new Response('Missing email', { status: 400 })

  const enabled = String(process.env.SHOT_TRACKING_ENABLED || '').toLowerCase() === 'true'
  if (!enabled) {
    return Response.json({ enabled: false, premiumRequired: true, shots: [] }, { status: 402 })
  }

  // Use global doc: shots keyed by email (no leagueId scoping — tracks across leagues)
  const docRef = db.collection(COL.shotTracking).doc(email)

  if (req.method === 'GET') {
    const snap = await docRef.get()
    const shots = snap.exists ? (snap.data().shots || []) : []
    return Response.json({ enabled: true, shots: Array.isArray(shots) ? shots : [] })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const action = String((body && body.action) || '').toLowerCase()

    if (action === 'clear') {
      await docRef.set({ email, shots: [] })
      return Response.json({ success: true })
    }

    const shot = {
      id: `s-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      club: cleanStr(body && body.club, 40),
      distanceYds: cleanNum(body && body.distanceYds),
      lie: cleanStr(body && body.lie, 40),
      result: cleanStr(body && body.result, 80),
      note: cleanStr(body && body.note, 400)
    }
    if (!shot.club) return new Response('Missing club', { status: 400 })

    const snap = await docRef.get()
    const existing = snap.exists ? (snap.data().shots || []) : []
    const shots = Array.isArray(existing) ? existing : []
    shots.unshift(shot)
    await docRef.set({ email, shots: shots.slice(0, 500) })
    return Response.json({ success: true, shot })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/shot-tracking' }
