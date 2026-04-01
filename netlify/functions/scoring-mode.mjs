import { getStore } from '@netlify/blobs'

export default async (req) => {
  const store = getStore('league-settings')

  if (req.method === 'GET') {
    const mode = await store.get('scoring-mode', { type: 'text' })
    return Response.json({ mode: mode || 'batch' })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const mode = body && body.mode
    const normalized = String(mode || '').toLowerCase()
    if (!['live', 'batch'].includes(normalized)) {
      return new Response('Invalid mode', { status: 400 })
    }
    await store.set('scoring-mode', normalized)
    return Response.json({ success: true, mode: normalized })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/scoring-mode'
}
