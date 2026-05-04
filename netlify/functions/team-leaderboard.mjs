import { getStore } from '@netlify/blobs'

function normalizeLeagueId(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
}

function leagueStoreName(base, leagueId) {
  const id = normalizeLeagueId(leagueId)
  return id ? `${base}-${id}` : base
}

function asInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function lowerEmail(v) {
  return String(v || '').trim().toLowerCase()
}

// Compute hole-by-hole points for two players in a sub-match.
// Returns { ptA, ptB } where each complete hole awards 1 point total.
function computeSubMatch(pA, pB) {
  const holesA = Array.isArray(pA && pA.holes) ? pA.holes : []
  const holesB = Array.isArray(pB && pB.holes) ? pB.holes : []
  let ptA = 0, ptB = 0
  for (let i = 0; i < 9; i++) {
    const hA = holesA[i]
    const hB = holesB[i]
    if (hA === null || hA === undefined || !Number.isFinite(Number(hA))) continue
    if (hB === null || hB === undefined || !Number.isFinite(Number(hB))) continue
    const a = Number(hA), b = Number(hB)
    if (a < b)      { ptA += 1; }
    else if (a > b) { ptB += 1; }
    else            { ptA += 0.5; ptB += 0.5; }
  }
  return { ptA, ptB }
}

function subResult(myPts, theirPts) {
  if (myPts > theirPts) return 'W'
  if (myPts < theirPts) return 'L'
  return 'T'
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  // ── Load teams ───────────────────────────────────────────────────
  const teamsStore = getStore(leagueStoreName('teams', leagueId))
  const { blobs: teamBlobs } = await teamsStore.list().catch(() => ({ blobs: [] }))
  const teams = []
  for (const b of teamBlobs || []) {
    if (!b || !b.key || !String(b.key).startsWith('team-')) continue
    const t = await teamsStore.get(b.key, { type: 'json' }).catch(() => null)
    if (t && t.teamNumber) teams.push(t)
  }
  teams.sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0))

  // ── Load all finalized match scorecards ──────────────────────────
  const scStore = getStore(leagueStoreName('match-scorecards', leagueId))
  const { blobs: scBlobs } = await scStore.list().catch(() => ({ blobs: [] }))
  const scorecards = []
  for (const b of scBlobs || []) {
    if (!b || !b.key) continue
    const sc = await scStore.get(b.key, { type: 'json' }).catch(() => null)
    if (sc && sc.status === 'final' && sc.week && sc.teamA && sc.teamB) {
      scorecards.push(sc)
    }
  }
  scorecards.sort((a, b) => (a.week || 0) - (b.week || 0))

  // ── Build per-team stats map ─────────────────────────────────────
  const statsMap = {}
  for (const t of teams) {
    statsMap[t.teamNumber] = {
      teamNumber: t.teamNumber,
      teamName: t.teamName || '',
      player1Email: t.player1Email,
      player2Email: t.player2Email,
      totalPoints: 0,
      p1Points: 0,
      p2Points: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      history: []
    }
  }

  // ── Process each scorecard ───────────────────────────────────────
  for (const sc of scorecards) {
    const { week, teamA: scTeamA, teamB: scTeamB, players: allPlayers, date } = sc
    if (!Array.isArray(allPlayers) || allPlayers.length < 4) continue

    const tA = teams.find(t => t.teamNumber === scTeamA)
    const tB = teams.find(t => t.teamNumber === scTeamB)
    if (!tA || !tB) continue

    const isOnTeamA = (email) => {
      const e = lowerEmail(email)
      return e === lowerEmail(tA.player1Email) || e === lowerEmail(tA.player2Email)
    }
    const isOnTeamB = (email) => {
      const e = lowerEmail(email)
      return e === lowerEmail(tB.player1Email) || e === lowerEmail(tB.player2Email)
    }

    const teamAPlayers = allPlayers.filter(p => p && p.email && isOnTeamA(p.email))
    const teamBPlayers = allPlayers.filter(p => p && p.email && isOnTeamB(p.email))
    if (teamAPlayers.length < 2 || teamBPlayers.length < 2) continue

    // Sort by handicapSnapshot ascending → index 0 = low HCP
    teamAPlayers.sort((a, b) => (a.handicapSnapshot || 0) - (b.handicapSnapshot || 0))
    teamBPlayers.sort((a, b) => (a.handicapSnapshot || 0) - (b.handicapSnapshot || 0))

    const lowA = teamAPlayers[0], highA = teamAPlayers[1]
    const lowB = teamBPlayers[0], highB = teamBPlayers[1]

    // Sub-match 1: low vs low
    const low = computeSubMatch(lowA, lowB)
    // Sub-match 2: high vs high
    const high = computeSubMatch(highA, highB)

    const totalA = low.ptA + high.ptA
    const totalB = low.ptB + high.ptB

    const teamAResult = subResult(totalA, totalB)
    const teamBResult = subResult(totalB, totalA)

    // Helper: which player from a team is p1 vs p2 per the team definition
    function buildTeamEntry(teamNum, tDef, myLow, myHigh, myLowPts, myHighPts, oppLowPts, oppHighPts, teamTotalPts, teamResult) {
      const s = statsMap[teamNum]
      if (!s) return

      const p1email = lowerEmail(tDef.player1Email)
      const isP1Low = lowerEmail(myLow.email) === p1email

      const p1 = isP1Low ? myLow : myHigh
      const p2 = isP1Low ? myHigh : myLow
      const p1Pts = isP1Low ? myLowPts : myHighPts
      const p2Pts = isP1Low ? myHighPts : myLowPts
      const oppP1Pts = isP1Low ? oppLowPts : oppHighPts
      const oppP2Pts = isP1Low ? oppHighPts : oppLowPts
      const p1Result = subResult(p1Pts, oppP1Pts)
      const p2Result = subResult(p2Pts, oppP2Pts)

      const oppNum = teamNum === scTeamA ? scTeamB : scTeamA
      const oppTeam = teams.find(t => t.teamNumber === oppNum)

      s.p1Points += p1Pts
      s.p2Points += p2Pts
      s.totalPoints += teamTotalPts
      if (teamResult === 'W') s.wins++
      else if (teamResult === 'L') s.losses++
      else s.ties++

      s.history.push({
        week,
        date: date || null,
        opponent: oppNum,
        opponentName: (oppTeam && oppTeam.teamName) ? oppTeam.teamName : `Team ${oppNum}`,
        p1Email: p1.email,
        p1Name: p1.name || p1.email,
        p1Result,
        p1Pts,
        p2Email: p2.email,
        p2Name: p2.name || p2.email,
        p2Result,
        p2Pts,
        teamPoints: teamTotalPts,
        teamResult
      })
    }

    buildTeamEntry(scTeamA, tA, lowA, highA, low.ptA, high.ptA, low.ptB, high.ptB, totalA, teamAResult)
    buildTeamEntry(scTeamB, tB, lowB, highB, low.ptB, high.ptB, low.ptA, high.ptA, totalB, teamBResult)
  }

  // ── Sort history by week, standings by total points ──────────────
  const standings = Object.values(statsMap)
  for (const t of standings) {
    t.history.sort((a, b) => (a.week || 0) - (b.week || 0))
  }
  standings.sort((a, b) => b.totalPoints - a.totalPoints)

  return Response.json({ standings })
}

export const config = {
  path: '/api/team-leaderboard'
}
