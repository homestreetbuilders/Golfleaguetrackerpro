import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('scramble-events')

  if (req.method === 'POST') {
    const body = await req.json()
    const key = `scramble-${body.date}-${Date.now()}`
    await store.setJSON(key, {
      date: body.date,
      course: body.course,
      teamSize: body.teamSize,
      teeTime: body.teeTime,
      notes: body.notes,
      teams: body.teams || [],
      createdAt: new Date().toISOString()
    })
    return Response.json({ success: true, key })
  }

  if (req.method === 'GET') {
    const { blobs } = await store.list()
    const events = []
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' })
      if (data) events.push(data)
    }
    return Response.json({ events })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/scramble-events'
}
