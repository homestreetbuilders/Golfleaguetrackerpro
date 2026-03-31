import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('rainouts')

  if (req.method === 'POST') {
    const body = await req.json()
    const key = `rainout-week-${body.week}`
    await store.setJSON(key, {
      week: body.week,
      originalDate: body.originalDate,
      reason: body.reason,
      rescheduledDate: body.rescheduledDate || null,
      markedAt: new Date().toISOString()
    })
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const { blobs } = await store.list()
    const rainouts = []
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' })
      if (data) rainouts.push(data)
    }
    return Response.json({ rainouts })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/rainouts'
}
