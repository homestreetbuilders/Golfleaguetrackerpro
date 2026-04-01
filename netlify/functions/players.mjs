import { getStore } from '@netlify/blobs'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export default async (req) => {
  const store = getStore('players')

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const includeRoles = url.searchParams.get('includeRoles') === '1'
    const roleStore = includeRoles ? getStore('user-roles') : null

    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const players = []

    for (const blob of blobs || []) {
      const data = await store.get(blob.key, { type: 'json' }).catch(() => null)
      if (!data || !data.email) continue

      const p = {
        name: data.name || '',
        email: normalizeEmail(data.email),
        phone: data.phone || '',
        handicap: typeof data.handicap === 'number' ? data.handicap : (data.handicap ? parseFloat(data.handicap) : null),
        updatedAt: data.updatedAt || null,
        createdAt: data.createdAt || null
      }

      if (includeRoles && roleStore) {
        const roleKey = `role-${p.email}`
        const role = await roleStore.get(roleKey, { type: 'text' }).catch(() => null)
        p.role = role || 'player'
      }

      players.push(p)
    }

    players.sort((a, b) => String(a.name).localeCompare(String(b.name)))
    return Response.json({ players })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const email = normalizeEmail(body && body.email)
    const name = body && body.name ? String(body.name).trim() : ''

    if (!email || !name) {
      return new Response('Missing name or email', { status: 400 })
    }

    const key = `player-${email}`
    const existing = await store.get(key, { type: 'json' }).catch(() => null)

    const updated = {
      ...(existing || {}),
      name,
      email,
      phone: body && body.phone ? String(body.phone).trim() : (existing && existing.phone) || '',
      handicap: body && body.handicap !== undefined && body.handicap !== null && String(body.handicap).trim() !== ''
        ? parseFloat(body.handicap)
        : ((existing && existing.handicap) ?? null),
      updatedAt: new Date().toISOString(),
      createdAt: (existing && existing.createdAt) || new Date().toISOString()
    }

    await store.setJSON(key, updated)
    return Response.json({ success: true, player: updated })
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const email = normalizeEmail(url.searchParams.get('email'))
    if (!email) {
      return new Response('Missing email', { status: 400 })
    }
    const key = `player-${email}`
    await store.delete(key).catch(() => null)
    return Response.json({ success: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/players'
}
