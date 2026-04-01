import { getStore } from '@netlify/blobs'

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export default async (req) => {
  const store = getStore('substitutes')

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const week = asInt(url.searchParams.get('week'))
    const playerEmail = normalizeEmail(url.searchParams.get('playerEmail'))

    if (week && playerEmail) {
      const key = `sub-${week}-${playerEmail}`
      const sub = await store.get(key, { type: 'json' }).catch(() => null)
      return Response.json({ substitute: sub || null })
    }

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const substitutes = []
    for (const blob of blobs || []) {
      const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
      if (data) substitutes.push(data)
    }
    return Response.json({ substitutes })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const week = asInt(body && body.week)
    const playerEmail = normalizeEmail(body && body.playerEmail)
    const substituteName = body && body.substituteName ? String(body.substituteName).trim() : ''
    const substituteHandicap = body && body.substituteHandicap !== undefined && body.substituteHandicap !== null && String(body.substituteHandicap).trim() !== ''
      ? Number(body.substituteHandicap)
      : null

    if (!week || !playerEmail || !substituteName) {
      return new Response('Missing week, playerEmail, or substituteName', { status: 400 })
    }

    const key = `sub-${week}-${playerEmail}`
    const record = {
      week,
      playerEmail,
      substituteName,
      substituteHandicap: Number.isFinite(substituteHandicap) ? substituteHandicap : null,
      updatedAt: new Date().toISOString()
    }

    await store.setJSON(key, record)
    return Response.json({ success: true, substitute: record })
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const week = asInt(url.searchParams.get('week'))
    const playerEmail = normalizeEmail(url.searchParams.get('playerEmail'))
    if (!week || !playerEmail) {
      return new Response('Missing week or playerEmail', { status: 400 })
    }
    const key = `sub-${week}-${playerEmail}`
    await store.delete(key).catch(() => null)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/substitutes'
}
