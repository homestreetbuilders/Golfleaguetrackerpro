import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('payments')

  if (req.method === 'POST') {
    const body = await req.json()
    const key = `payment-${body.player.replace(/\s+/g, '-').toLowerCase()}`
    await store.setJSON(key, {
      player: body.player,
      team: body.team,
      amount: body.amount || 150,
      status: body.status || 'paid',
      paidAt: new Date().toISOString()
    })
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const { blobs } = await store.list()
    const payments = []
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: 'json' })
      if (data) payments.push(data)
    }
    return Response.json({ payments })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/payments'
}
