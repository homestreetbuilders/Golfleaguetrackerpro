import { db, COL, lid, listDocs, getDoc, setDoc, deleteDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function asInt(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null }
function normalizeRole(v) { const r = String(v || '').trim().toLowerCase(); return ['admin','scorer','player'].includes(r) ? r : 'player' }
function normalizeScope(v) { const s = String(v || '').trim().toLowerCase(); return ['all','admins','scorers','players'].includes(s) ? s : 'all' }

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const limit = asInt(url.searchParams.get('limit')) || 20
    const includePinned = url.searchParams.get('includePinned') !== '0'

    const pinned = includePinned ? await getDoc(COL.announcements, leagueId, 'pinned') : null

    const docs = await listDocs(COL.announcements, leagueId)
    const items = docs
      .filter(d => d.id && String(d.id).startsWith('a-'))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, Math.max(1, Math.min(100, limit)))

    return Response.json({ pinned: pinned || null, announcements: items })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const action = String((body && body.action) || '').toLowerCase()

    if (action === 'pin') {
      const item = body && body.item ? body.item : null
      if (!item || !item.message) return new Response('Missing item', { status: 400 })
      const normalized = {
        id: item.id || `p-${Date.now()}`,
        message: String(item.message),
        scope: normalizeScope(item.scope),
        createdAt: item.createdAt || new Date().toISOString(),
        createdBy: item.createdBy || null,
        createdByRole: normalizeRole(item.createdByRole)
      }
      await setDoc(COL.announcements, leagueId, 'pinned', normalized)
      return Response.json({ success: true, pinned: normalized })
    }

    if (action === 'unpin') {
      await deleteDoc(COL.announcements, leagueId, 'pinned')
      return Response.json({ success: true })
    }

    const message = body && body.message ? String(body.message).trim() : ''
    if (!message) return new Response('Missing message', { status: 400 })

    const item = {
      id: `a-${Date.now()}`,
      message,
      scope: normalizeScope(body && body.scope),
      createdAt: new Date().toISOString(),
      createdBy: body && body.createdBy ? String(body.createdBy) : null,
      createdByRole: normalizeRole(body && body.createdByRole)
    }

    await setDoc(COL.announcements, leagueId, item.id, item)
    return Response.json({ success: true, announcement: item })
  }

  if (req.method === 'DELETE') {
    const id = String(url.searchParams.get('id') || '')
    if (!id || !id.startsWith('a-')) return new Response('Missing id', { status: 400 })
    await deleteDoc(COL.announcements, leagueId, id)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/announcements' }
