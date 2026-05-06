import { requireAdmin } from './_auth.mjs'
import { db, COL } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }

const DEFAULT_SETTINGS = {
  leagueName: 'Fairway Command League', seasonStart: null, seasonEnd: null,
  teePlacementsCount: 3, handicapMode: 'usga', customFormulaText: '',
  netSkinsSeasonPot: 0, grossSkinsSeasonPot: 0, fiftyFiftySeasonBuyIn: 0,
  nineHoleStrokeMethod: 'half'
}

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const snap = await db.collection(COL.leagueSettings).doc(leagueId).get()
    return Response.json({ settings: snap.exists ? snap.data() : DEFAULT_SETTINGS })
  }

  if (req.method === 'POST') {
    const authErr = await requireAdmin(req)
    if (authErr) return authErr
    const body = await req.json().catch(() => null)
    const incoming = body && typeof body === 'object' ? body : {}

    const netPot   = Number(incoming.netSkinsSeasonPot   ?? 0); const grossPot = Number(incoming.grossSkinsSeasonPot ?? 0)
    const fiftyPot = Number(incoming.fiftyFiftySeasonBuyIn ?? 0)
    const normalized = {
      leagueName:            incoming.leagueName ? String(incoming.leagueName) : 'Fairway Command League',
      seasonStart:           incoming.seasonStart  ? String(incoming.seasonStart)  : null,
      seasonEnd:             incoming.seasonEnd    ? String(incoming.seasonEnd)    : null,
      teePlacementsCount:    Number.isFinite(Number(incoming.teePlacementsCount)) ? Number(incoming.teePlacementsCount) : 3,
      handicapMode:          incoming.handicapMode  ? String(incoming.handicapMode).toLowerCase()  : 'usga',
      customFormulaText:     incoming.customFormulaText ? String(incoming.customFormulaText) : '',
      netSkinsSeasonPot:     Number.isFinite(netPot)   ? Math.max(0, netPot)   : 0,
      grossSkinsSeasonPot:   Number.isFinite(grossPot) ? Math.max(0, grossPot) : 0,
      fiftyFiftySeasonBuyIn: Number.isFinite(fiftyPot) ? Math.max(0, fiftyPot) : 0,
      nineHoleStrokeMethod:  ['half','full'].includes(incoming.nineHoleStrokeMethod) ? incoming.nineHoleStrokeMethod : 'half',
      leagueId, updatedAt: new Date().toISOString()
    }
    await db.collection(COL.leagueSettings).doc(leagueId).set(normalized)
    return Response.json({ success: true, settings: normalized })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/league-settings' }
