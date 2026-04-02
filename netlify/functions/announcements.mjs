import { getStore } from '@netlify/blobs'

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function normalizeRole(v) {
  const r = String(v || '').trim().toLowerCase()
  if (r === 'admin' || r === 'scorer' || r === 'player') return r
  return 'player'
}

function normalizeScope(v) {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'all' || s === 'admins' || s === 'scorers' || s === 'players') return s
  return 'all'
}

export default async (req) => {
  const store = getStore('announcements')
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const limit = asInt(url.searchParams.get('limit')) || 20
    const includePinned = url.searchParams.get('includePinned') !== '0'

    const pinned = includePinned ? await store.get('pinned', { type: 'json' }).catch(() => null) : null

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const items = []
    for (const b of blobs || []) {
      if (!b || !b.key) continue
      if (b.key === 'pinned') continue
      if (!b.key.startsWith('a-')) continue
      const it = await store.get(b.key, { type: 'json' }).catch(() => null)
      if (it) items.push(it)
    }

    items.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

    return Response.json({
      pinned: pinned || null,
      announcements: items.slice(0, Math.max(1, Math.min(100, limit)))
    })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const action = String((body && body.action) || '').toLowerCase()

    if (action === 'pin') {
      const pinned = body && body.item ? body.item : null
      if (!pinned || !pinned.message) {
        return new Response('Missing item', { status: 400 })
      }
      const normalized = {
        id: pinned.id || `p-${Date.now()}`,
        message: String(pinned.message),
        scope: normalizeScope(pinned.scope),
        createdAt: pinned.createdAt || new Date().toISOString(),
        createdBy: pinned.createdBy || null,
        createdByRole: normalizeRole(pinned.createdByRole)
      }
      await store.setJSON('pinned', normalized)
      return Response.json({ success: true, pinned: normalized })
    }

    if (action === 'unpin') {
      await store.delete('pinned').catch(() => null)
      return Response.json({ success: true })
    }

    const message = body && body.message ? String(body.message).trim() : ''
    if (!message) {
      return new Response('Missing message', { status: 400 })
    }

    const item = {
      id: `a-${Date.now()}`,
      message,
      scope: normalizeScope(body && body.scope),
      createdAt: new Date().toISOString(),
      createdBy: body && body.createdBy ? String(body.createdBy) : null,
      createdByRole: normalizeRole(body && body.createdByRole)
    }

    await store.setJSON(item.id, item)
    return Response.json({ success: true, announcement: item })
  }

  if (req.method === 'DELETE') {
    const id = String(url.searchParams.get('id') || '')
    if (!id || !id.startsWith('a-')) {
      return new Response('Missing id', { status: 400 })
    }
    await store.delete(id).catch(() => null)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/announcements'
}
