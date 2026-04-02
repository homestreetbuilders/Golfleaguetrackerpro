import { getStore } from '@netlify/blobs'

function normalizeId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

export default async (req) => {
  const store = getStore('leagues')
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const leagues = []
    for (const b of blobs || []) {
      if (!b || !b.key || !String(b.key).startsWith('league-')) continue
      const l = await store.get(b.key, { type: 'json' }).catch(() => null)
      if (l) leagues.push(l)
    }
    leagues.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    return Response.json({ leagues })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const name = body && body.name ? String(body.name).trim() : ''
    if (!name) return new Response('Missing name', { status: 400 })

    const id = normalizeId(body && body.id ? body.id : name)
    if (!id) return new Response('Invalid id', { status: 400 })

    const record = {
      id,
      name,
      createdAt: new Date().toISOString()
    }

    await store.setJSON(`league-${id}`, record)
    return Response.json({ success: true, league: record })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/leagues'
}
