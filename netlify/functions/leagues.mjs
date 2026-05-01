import { getStore } from '@netlify/blobs'

function normalizeId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

export default async (req) => {
  const store = getStore('leagues')
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const { blobs } = await store.list().catch(() => ({ blobs: [] }))
    const leagues = []
    for (const b of blobs || []) {
      if (!b || !b.key || !String(b.key).startsWith('league-')) continue
      const l = await store.get(b.key, { type: 'json' }).catch(() => null)
      if (l) leagues.push(l)
    }

    // Auto-discover well-known seeded leagues whose blob data exists but whose
    // league record was never written (e.g. seeder timed out before completing).
    // Probes the scores store for each candidate; if data is present, synthesizes
    // and persists the league record so the leaderboard auto-detect finds it.
    const knownSeededLeagues = [
      { id: 'kelleys-heroes',      name: 'Kelleys Heroes'      },
      { id: 'mud-run-golf-league', name: 'Mud Run Golf League'  }
    ]
    const existingIds = new Set(leagues.map(l => l.id))
    for (const kl of knownSeededLeagues) {
      if (existingIds.has(kl.id)) continue
      const probeStore = getStore(`scores-${kl.id}`)
      const { blobs: pb } = await probeStore.list({ limit: 1 }).catch(() => ({ blobs: [] }))
      if (pb && pb.length > 0) {
        const record = { id: kl.id, name: kl.name, createdAt: new Date().toISOString() }
        await store.setJSON(`league-${kl.id}`, record).catch(() => null)
        leagues.push(record)
      }
    }

    leagues.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    return Response.json({ leagues })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const name = body && body.name ? String(body.name).trim() : ''
    if (!name) return new Response('Missing name', { status: 400 })

    const id = normalizeId(body && body.id ? body.id : name)
    if (!id) return new Response('Invalid id', { status: 400 })

    const record = {
      id,
      name,
      createdAt: new Date().toISOString()
    }

    await store.setJSON(`league-${id}`, record)
    return Response.json({ success: true, league: record })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/leagues'
}
