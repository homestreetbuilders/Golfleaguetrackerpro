import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('scores')

  if (req.method === 'POST') {
    const body = await req.json()
    const key = `${body.player}-${body.date}-${Date.now()}`
    await store.setJSON(key, {
      player: body.player,
      course: body.course,
      side: body.side,
      date: body.date,
      score: body.score,
      putts: body.putts,
      fairways: body.fairways,
      submittedAt: new Date().toISOString()
    })
    return Response.json({ success: true, key })
  }

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const player = url.searchParams.get('player')
    const { blobs } = await store.list({ prefix: player ? player : undefined })
    const scores = []
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' })
      if (data) scores.push(data)
    }
    return Response.json({ scores })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/scores'
}
