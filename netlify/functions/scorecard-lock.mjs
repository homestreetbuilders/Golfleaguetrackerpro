import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('scorecard-locks')

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const player = url.searchParams.get('player')
    const week = url.searchParams.get('week')
    if (!player || !week) {
      return new Response('Missing player or week', { status: 400 })
    }
    const key = `lock-${String(player).toLowerCase()}-week-${week}`
    const lock = await store.get(key, { type: 'json' })
    return Response.json(lock || { locked: false })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const player = body && body.player
    const week = body && body.week
    const locked = Boolean(body && body.locked)
    if (!player || !week) {
      return new Response('Missing player or week', { status: 400 })
    }

    const key = `lock-${String(player).toLowerCase()}-week-${week}`
    await store.setJSON(key, {
      locked,
      updatedAt: new Date().toISOString(),
      reason: body && body.reason ? body.reason : null
    })

    return Response.json({ success: true, locked })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/scorecard-lock'
}
