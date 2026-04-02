import { getStore } from '@netlify/blobs'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function asNum(v) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

export default async (req) => {
  const store = getStore('handicap-overrides')
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const email = normalizeEmail(url.searchParams.get('email'))
    if (email) {
      const cur = await store.get(`override-${email}`, { type: 'json' }).catch(() => null)
      return Response.json({ override: cur || null })
    }

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const overrides = []
    for (const b of blobs || []) {
      if (!b || !b.key || !String(b.key).startsWith('override-')) continue
      const ov = await store.get(b.key, { type: 'json' }).catch(() => null)
      if (ov) overrides.push(ov)
    }
    overrides.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
    return Response.json({ overrides })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const action = String((body && body.action) || '').toLowerCase()
    const email = normalizeEmail(body && body.email)
    if (!email) return new Response('Missing email', { status: 400 })

    if (action === 'clear') {
      await store.delete(`override-${email}`).catch(() => null)
      return Response.json({ success: true })
    }

    const value = asNum(body && body.value)
    if (value === null) return new Response('Missing value', { status: 400 })

    const record = {
      email,
      value,
      note: body && body.note ? String(body.note).trim() : '',
      setBy: body && body.setBy ? String(body.setBy) : null,
      setAt: new Date().toISOString()
    }

    await store.setJSON(`override-${email}`, record)
    return Response.json({ success: true, override: record })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/handicap-overrides'
}
