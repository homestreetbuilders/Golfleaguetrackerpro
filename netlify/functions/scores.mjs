import { db, COL, lid, addDoc } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }

export default async (req) => {
  const url      = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  if (req.method === 'POST') {
    const body        = await req.json().catch(() => null)
    const player      = body && body.player
    const playerEmail = body && body.playerEmail ? String(body.playerEmail).trim().toLowerCase() : null
    const week        = body && body.week
    const date        = body && body.date
    if (!player || !week || !date) return new Response('Missing player, week, or date', { status: 400 })

    // Check scorecard locks
    const nameLockId  = `lock-${String(player).toLowerCase()}-week-${week}`
    const emailLockId = playerEmail ? `lock-email-${playerEmail}-week-${week}` : null
    const nameLockSnap  = await db.collection(COL.scorecardLocks).doc(lid(leagueId, nameLockId)).get()
    const emailLockSnap = emailLockId ? await db.collection(COL.scorecardLocks).doc(lid(leagueId, emailLockId)).get() : null
    const nameLock  = nameLockSnap.exists  ? nameLockSnap.data()  : null
    const emailLock = emailLockSnap && emailLockSnap.exists ? emailLockSnap.data() : null
    if ((nameLock && nameLock.locked) || (emailLock && emailLock.locked)) {
      return new Response('Scorecard locked', { status: 423 })
    }

    const status    = (body.status) === 'final' ? 'final' : 'draft'
    const rawSide   = body.side ? String(body.side).toLowerCase() : 'front'
    const side      = rawSide === 'back' ? 'back' : (rawSide === 'both' || rawSide === '18' || rawSide === 'full') ? '18' : 'front'
    const parTotal  = body.parTotal && Number.isFinite(Number(body.parTotal)) ? Number(body.parTotal) : null
    const stats     = body.stats && typeof body.stats === 'object' ? body.stats : null

    const scoreData = {
      player, playerEmail, week, date,
      course:            body.course   || null,
      tee:               body.tee      || null,
      side,
      holes:             Array.isArray(body.holes)  ? body.holes  : null,
      shots:             Array.isArray(body.shots)  ? body.shots  : null,
      grossTotal:        body.grossTotal !== undefined && typeof body.grossTotal === 'number' ? body.grossTotal : null,
      handicapSnapshot:  body.handicapSnapshot !== undefined && typeof body.handicapSnapshot === 'number' ? body.handicapSnapshot : null,
      parTotal,
      stats: stats ? { perHole: Array.isArray(stats.perHole) ? stats.perHole : null, round: stats.round || null } : null,
      status,
      submittedBy: body.submittedBy || null,
      submittedAt: new Date().toISOString()
    }

    const ref = await addDoc(COL.scores, leagueId, scoreData)

    if (status === 'final') {
      const lockData = { locked: true, lockedAt: new Date().toISOString(), reason: 'submitted' }
      await db.collection(COL.scorecardLocks).doc(lid(leagueId, nameLockId)).set({ leagueId, ...lockData })
      if (emailLockId) {
        await db.collection(COL.scorecardLocks).doc(lid(leagueId, emailLockId)).set({ leagueId, ...lockData })
      }
    }

    return Response.json({ success: true, id: ref.id, locked: status === 'final' })
  }

  if (req.method === 'GET') {
    const playerFilter      = url.searchParams.get('player')
    const playerEmailFilter = url.searchParams.get('playerEmail')
      ? String(url.searchParams.get('playerEmail')).trim().toLowerCase() : null
    const weekFilter    = url.searchParams.get('week')
    const includeDraft  = url.searchParams.get('includeDraft') === '1'

    let q = db.collection(COL.scores).where('leagueId', '==', leagueId)
    if (weekFilter) q = q.where('week', '==', Number(weekFilter) || weekFilter)
    if (!includeDraft) q = q.where('status', '==', 'final')

    const snap   = await q.get()
    const scores = []
    for (const doc of snap.docs) {
      const data = doc.data()
      if (playerFilter || playerEmailFilter) {
        const nameMatch  = playerFilter      && String(data.player      || '').toLowerCase() === String(playerFilter).toLowerCase()
        const emailMatch = playerEmailFilter && String(data.playerEmail || '').toLowerCase() === playerEmailFilter
        if (!nameMatch && !emailMatch) continue
      }
      scores.push(data)
    }
    return Response.json({ scores })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/scores' }
