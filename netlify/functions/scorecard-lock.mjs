import { getStore } from '@netlify/blobs'

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function leagueStoreName(base, leagueId) {
  const id = normalizeLeagueId(leagueId)
  return id ? `${base}-${id}` : base
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  const store = getStore(leagueStoreName('scorecard-locks', leagueId))

  if (req.method === 'GET') {
    const player = url.searchParams.get('player')
    // Fix #7: also accept email param so the UI can query by email-based key
    const email = url.searchParams.get('email')
      ? String(url.searchParams.get('email')).trim().toLowerCase()
      : null
    const week = url.searchParams.get('week')
    if (!player && !email) {
      return new Response('Missing player or email', { status: 400 })
    }
    if (!week) {
      return new Response('Missing week', { status: 400 })
    }

    // Fix #7: check both key formats; locked if either is set
    const nameLock = player
      ? await store.get(`lock-${String(player).toLowerCase()}-week-${week}`, { type: 'json' }).catch(() => null)
      : null
    const emailLock = email
      ? await store.get(`lock-email-${email}-week-${week}`, { type: 'json' }).catch(() => null)
      : null

    const locked = (nameLock && nameLock.locked) || (emailLock && emailLock.locked)
    return Response.json(locked ? (nameLock || emailLock) : { locked: false })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const player = body && body.player
    // Fix #7: also support email-based lock key in POST
    const email = body && body.email ? String(body.email).trim().toLowerCase() : null
    const week = body && body.week
    const locked = Boolean(body && body.locked)
    if (!player && !email) {
      return new Response('Missing player or email', { status: 400 })
    }
    if (!week) {
      return new Response('Missing week', { status: 400 })
    }

    const lockData = {
      locked,
      updatedAt: new Date().toISOString(),
      reason: body && body.reason ? body.reason : null
    }

    // Fix #7: write to whichever key formats are available
    if (player) {
      await store.setJSON(`lock-${String(player).toLowerCase()}-week-${week}`, lockData)
    }
    if (email) {
      await store.setJSON(`lock-email-${email}-week-${week}`, lockData)
    }

    return Response.json({ success: true, locked })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = {
  path: '/api/scorecard-lock'
}
