import { db, COL, lid } from './_firebase.mjs'

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

export default async (req) => {
  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'GET') {
    const player = url.searchParams.get('player')
    const email = url.searchParams.get('email')
      ? String(url.searchParams.get('email')).trim().toLowerCase()
      : null
    const week = url.searchParams.get('week')
    if (!player && !email) return new Response('Missing player or email', { status: 400 })
    if (!week) return new Response('Missing week', { status: 400 })

    const nameLockId  = player ? `lock-${String(player).toLowerCase()}-week-${week}` : null
    const emailLockId = email  ? `lock-email-${email}-week-${week}` : null

    const [nameLockSnap, emailLockSnap] = await Promise.all([
      nameLockId  ? db.collection(COL.scorecardLocks).doc(lid(leagueId, nameLockId)).get()  : Promise.resolve(null),
      emailLockId ? db.collection(COL.scorecardLocks).doc(lid(leagueId, emailLockId)).get() : Promise.resolve(null)
    ])

    const nameLock  = nameLockSnap  && nameLockSnap.exists  ? nameLockSnap.data()  : null
    const emailLock = emailLockSnap && emailLockSnap.exists ? emailLockSnap.data() : null

    const locked = (nameLock && nameLock.locked) || (emailLock && emailLock.locked)
    return Response.json(locked ? (nameLock || emailLock) : { locked: false })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const player = body && body.player
    const email = body && body.email ? String(body.email).trim().toLowerCase() : null
    const week = body && body.week
    const locked = Boolean(body && body.locked)
    if (!player && !email) return new Response('Missing player or email', { status: 400 })
    if (!week) return new Response('Missing week', { status: 400 })

    const lockData = {
      locked,
      updatedAt: new Date().toISOString(),
      reason: body && body.reason ? body.reason : null
    }

    const writes = []
    if (player) {
      const nameLockId = `lock-${String(player).toLowerCase()}-week-${week}`
      writes.push(db.collection(COL.scorecardLocks).doc(lid(leagueId, nameLockId)).set({ leagueId, ...lockData }))
    }
    if (email) {
      const emailLockId = `lock-email-${email}-week-${week}`
      writes.push(db.collection(COL.scorecardLocks).doc(lid(leagueId, emailLockId)).set({ leagueId, ...lockData }))
    }
    await Promise.all(writes)

    return Response.json({ success: true, locked })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/scorecard-lock' }
