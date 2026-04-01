import { getStore } from '@netlify/blobs'

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

export default async (req) => {
  const store = getStore('rainouts')

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const week = asInt(body && body.week)
    if (!week) {
      return new Response('Missing week', { status: 400 })
    }
    const key = `rainout-week-${week}`
    await store.setJSON(key, {
      week,
      originalDate: body.originalDate,
      reason: body.reason,
      rescheduledDate: body.rescheduledDate || null,
      status: body.status || 'pending',
      markedAt: new Date().toISOString()
    })
    return Response.json({ success: true })
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const week = asInt(url.searchParams.get('week'))
    if (!week) {
      return new Response('Missing week', { status: 400 })
    }
    await store.delete(`rainout-week-${week}`).catch(() => null)
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
