import { getStore } from '@netlify/blobs'

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

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('brackets', leagueId))
  const id = normalizeId(url.searchParams.get('id'))

  if (req.method === 'GET') {
    if (id) {
      const bracket = await store.get(`bracket-${id}`, { type: 'json' }).catch(() => null)
      if (!bracket) return new Response('Not found', { status: 404 })
      return Response.json({ bracket })
    }

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const brackets = []
    for (const b of blobs || []) {
      if (!b || !b.key || !String(b.key).startsWith('bracket-')) continue
      const item = await store.get(b.key, { type: 'json' }).catch(() => null)
      if (item) brackets.push(item)
    }
    brackets.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    return Response.json({ brackets })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const action = String((body && body.action) || '').toLowerCase()

    if (action === 'delete') {
      const delId = normalizeId(body && body.id)
      if (!delId) return new Response('Missing id', { status: 400 })
      await store.delete(`bracket-${delId}`).catch(() => null)
      return Response.json({ success: true })
    }

    const name = body && body.name ? String(body.name).trim() : 'Playoffs'
    const bracketId = normalizeId(body && body.id ? body.id : (body && body.name ? body.name : 'playoffs')) || `playoffs-${Date.now()}`
    const bracket = {
      id: bracketId,
      name,
      type: body && body.type ? String(body.type) : 'single_elim',
      rounds: Array.isArray(body && body.rounds) ? body.rounds : [],
      notes: body && body.notes ? String(body.notes) : '',
      updatedAt: new Date().toISOString(),
      createdAt: (body && body.createdAt) ? String(body.createdAt) : new Date().toISOString()
    }

    const existing = await store.get(`bracket-${bracketId}`, { type: 'json' }).catch(() => null)
    if (existing && existing.createdAt) bracket.createdAt = existing.createdAt

    await store.setJSON(`bracket-${bracketId}`, bracket)
    return Response.json({ success: true, bracket })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/brackets'
}
