import { db, COL, lid, listDocs, getDoc, setDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function normalizeGame(v) { const s = String(v || '').trim().toLowerCase(); return ['net_skins','gross_skins','fifty_fifty'].includes(s) ? s : null }
function gameField(game) { if (game === 'net_skins') return 'netSkins'; if (game === 'gross_skins') return 'grossSkins'; if (game === 'fifty_fifty') return 'fiftyFifty'; return null }

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const email = normalizeEmail(url.searchParams.get('email'))
    if (email) {
      const rec = await getDoc(COL.sideGameOptins, leagueId, email)
      return Response.json({ optIn: rec || null })
    }
    const optIns = await listDocs(COL.sideGameOptins, leagueId)
    optIns.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
    return Response.json({ optIns })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const email = normalizeEmail(body && body.email)
    const game = normalizeGame(body && body.game)
    const enabled = !!(body && body.enabled)
    const joinedWeek = asInt(body && body.joinedWeek)

    if (!email || !game) return new Response('Missing email or game', { status: 400 })
    const field = gameField(game)
    if (!field) return new Response('Invalid game', { status: 400 })

    const existing = await getDoc(COL.sideGameOptins, leagueId, email)
    const next = {
      ...(existing || {}),
      email,
      [field]: {
        enabled,
        joinedWeek: enabled ? (joinedWeek || (existing && existing[field] && existing[field].joinedWeek) || 1) : null
      },
      updatedAt: new Date().toISOString()
    }

    await setDoc(COL.sideGameOptins, leagueId, email, next)
    return Response.json({ success: true, optIn: next })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/side-game-optins' }
