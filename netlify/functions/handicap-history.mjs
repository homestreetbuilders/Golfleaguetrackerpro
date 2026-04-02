import { getStore } from '@netlify/blobs'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

export default async (req) => {
  const store = getStore('handicap-history')
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const email = normalizeEmail(url.searchParams.get('email'))
    if (!email) return new Response('Missing email', { status: 400 })

    const limit = asInt(url.searchParams.get('limit')) || 50
    const prefix = `hist-${email}-`
    const { blobs } = await store.list({ prefix }).catch(() => ({ blobs: [] }))
    const items = []
    for (const b of blobs || []) {
      const it = await store.get(b.key, { type: 'json' }).catch(() => null)
      if (it) items.push(it)
    }
    items.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    return Response.json({ history: items.slice(0, Math.max(1, Math.min(200, limit))) })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const email = normalizeEmail(body && body.email)
    if (!email) return new Response('Missing email', { status: 400 })

    const entry = {
      email,
      value: typeof body.value === 'number' ? body.value : (body.value ? parseFloat(body.value) : null),
      source: body && body.source ? String(body.source) : 'system',
      at: new Date().toISOString(),
      week: body && body.week ? body.week : null,
      date: body && body.date ? body.date : null,
      note: body && body.note ? String(body.note) : null
    }

    if (entry.value === null || !Number.isFinite(entry.value)) {
      return new Response('Missing value', { status: 400 })
    }

    const key = `hist-${email}-${Date.now()}`
    await store.setJSON(key, entry)
    return Response.json({ success: true, entry })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/handicap-history'
}
