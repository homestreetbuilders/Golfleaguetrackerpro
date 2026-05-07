import { db, COL, lid, listDocs, getDoc, setDoc, deleteDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const week = asInt(url.searchParams.get('week'))
    const playerEmail = normalizeEmail(url.searchParams.get('playerEmail'))

    if (week && playerEmail) {
      const sub = await getDoc(COL.substitutes, leagueId, `sub-${week}-${playerEmail}`)
      return Response.json({ substitute: sub || null })
    }

    const substitutes = await listDocs(COL.substitutes, leagueId)
    return Response.json({ substitutes })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const week = asInt(body && body.week)
    const playerEmail = normalizeEmail(body && body.playerEmail)
    const substituteName = body && body.substituteName ? String(body.substituteName).trim() : ''
    const substituteHandicap = body && body.substituteHandicap !== undefined && body.substituteHandicap !== null && String(body.substituteHandicap).trim() !== ''
      ? Number(body.substituteHandicap) : null

    if (!week || !playerEmail || !substituteName) {
      return new Response('Missing week, playerEmail, or substituteName', { status: 400 })
    }

    // Side game opt-ins for this sub assignment
    const sg = body && body.subSideGames && typeof body.subSideGames === 'object' ? body.subSideGames : {}
    const subSideGames = {
      netSkins:   Boolean(sg.netSkins),
      grossSkins: Boolean(sg.grossSkins),
      fiftyFifty: Boolean(sg.fiftyFifty),
    }

    // Assignment log fields
    const assignedBy  = body && body.assignedBy  ? String(body.assignedBy).trim()  : null
    const weekDate    = body && body.weekDate     ? String(body.weekDate).trim()    : null
    const absentPlayerName = body && body.absentPlayerName ? String(body.absentPlayerName).trim() : null
    const substituteEmail  = body && body.substituteEmail  ? normalizeEmail(body.substituteEmail) : null

    const now = new Date().toISOString()
    const record = {
      week, playerEmail, substituteName,
      substituteHandicap: Number.isFinite(substituteHandicap) ? substituteHandicap : null,
      substituteEmail,
      subSideGames,
      absentPlayerName,
      weekDate,
      assignedBy,
      assignedAt: now,
      updatedAt:  now,
    }
    await setDoc(COL.substitutes, leagueId, `sub-${week}-${playerEmail}`, record)
    return Response.json({ success: true, substitute: record })
  }

  if (req.method === 'DELETE') {
    const week = asInt(url.searchParams.get('week'))
    const playerEmail = normalizeEmail(url.searchParams.get('playerEmail'))
    if (!week || !playerEmail) return new Response('Missing week or playerEmail', { status: 400 })
    await deleteDoc(COL.substitutes, leagueId, `sub-${week}-${playerEmail}`)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/substitutes' }
