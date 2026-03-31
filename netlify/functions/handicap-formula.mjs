import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('handicap-config')

  if (req.method === 'POST') {
    const body = await req.json()
    await store.setJSON('formula', {
      bestN: body.bestN || 8,
      lastN: body.lastN || 20,
      multiplier: body.multiplier || 0.96,
      maxHcp: body.maxHcp || 18,
      minRounds: body.minRounds || 3,
      bonus: body.bonus || 'none',
      updatedAt: new Date().toISOString()
    })
    return Response.json({ success: true })
  }

  if (req.method === 'GET') {
    const formula = await store.get('formula', { type: 'json' })
    if (!formula) {
      return Response.json({
        bestN: 8, lastN: 20, multiplier: 0.96,
        maxHcp: 18, minRounds: 3, bonus: 'none'
      })
    }
    return Response.json(formula)
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/handicap-formula'
}
