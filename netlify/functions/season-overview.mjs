import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('season-overview')
  const key = 'rules'

  if (req.method === 'GET') {
    const rules = await store.get(key, { type: 'json' }).catch(() => null)
    return Response.json({ rules: rules || { title: 'Season Overview', content: '' } })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const title = body && body.title ? String(body.title) : 'Season Overview'
    const content = body && body.content ? String(body.content) : ''
    const updated = { title, content, updatedAt: new Date().toISOString() }
    await store.setJSON(key, updated)
    return Response.json({ success: true, rules: updated })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/season-overview'
}
