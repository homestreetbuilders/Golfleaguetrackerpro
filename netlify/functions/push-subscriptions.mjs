import { getStore } from '@netlify/blobs'

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase()
}

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function leagueStoreName(base, leagueId) {
  const id = normalizeLeagueId(leagueId)
  return id ? `${base}-${id}` : base
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('push-subscriptions', leagueId))

  if (req.method === 'GET') {
    const email = normalizeEmail(url.searchParams.get('email'))
    if (email) {
      const sub = await store.get(`sub-${email}`, { type: 'json' }).catch(() => null)
      return Response.json({ subscription: sub || null })
    }

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const subs = []
    for (const b of blobs || []) {
      if (!b || !b.key || !String(b.key).startsWith('sub-')) continue
      const s = await store.get(b.key, { type: 'json' }).catch(() => null)
      if (s) subs.push(s)
    }
    subs.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
    return Response.json({ subscriptions: subs })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const email = normalizeEmail(body && body.email)
    const subscription = body && body.subscription ? body.subscription : null
    if (!email || !subscription) {
      return new Response('Missing email or subscription', { status: 400 })
    }

    const record = {
      email,
      subscription,
      userAgent: body && body.userAgent ? String(body.userAgent) : null,
      updatedAt: new Date().toISOString(),
      createdAt: (body && body.createdAt) ? String(body.createdAt) : new Date().toISOString()
    }

    const existing = await store.get(`sub-${email}`, { type: 'json' }).catch(() => null)
    if (existing && existing.createdAt) record.createdAt = existing.createdAt

    await store.setJSON(`sub-${email}`, record)
    return Response.json({ success: true })
  }

  if (req.method === 'DELETE') {
    const email = normalizeEmail(url.searchParams.get('email'))
    if (!email) return new Response('Missing email', { status: 400 })
    await store.delete(`sub-${email}`).catch(() => null)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/push-subscriptions'
}
