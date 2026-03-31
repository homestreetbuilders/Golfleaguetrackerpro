import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('schedule')

  if (req.method === 'POST') {
    const body = await req.json()
    const key = `week-${body.week}`
    const existing = await store.get(key, { type: 'json' }) || {}
    const updated = { ...existing, ...body, updatedAt: new Date().toISOString() }
    await store.setJSON(key, updated)
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const { blobs } = await store.list()
    const weeks = []
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' })
      if (data) weeks.push(data)
    }
    return Response.json({ weeks })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/schedule'
}
