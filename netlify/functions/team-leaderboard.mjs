import { listDocs, COL } from './_firebase.mjs'

function normalizeLeagueId(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') }
function lowerEmail(v) { return String(v || '').trim().toLowerCase() }

function computeSubMatch(pA, pB) {
  const holesA = Array.isArray(pA && pA.holes) ? pA.holes : []
  const holesB = Array.isArray(pB && pB.holes) ? pB.holes : []
  let ptA = 0, ptB = 0
  for (let i = 0; i < 9; i++) {
    const hA = holesA[i], hB = holesB[i]
    if (hA === null || hA === undefined || !Number.isFinite(Number(hA))) continue
    if (hB === null || hB === undefined || !Number.isFinite(Number(hB))) continue
    const a = Number(hA), b = Number(hB)
    if (a < b) { ptA += 1 } else if (a > b) { ptB += 1 } else { ptA += 0.5; ptB += 0.5 }
  }
  return { ptA, ptB }
}

function subResult(myPts, theirPts) {
  if (myPts > theirPts) return 'W'
  if (myPts < theirPts) return 'L'
  return 'T'
}

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const url = new URL(req.url)
  const leagueId = normalizeLeagueId(url.searchParams.get('leagueId'))
  if (!leagueId) return new Response('Missing leagueId', { status: 400 })

  const [teamDocs, scorecardDocs] = await Promise.all([
    listDocs(COL.teams, leagueId),
    listDocs(COL.matchScorecards, leagueId)
  ])

  const teams = teamDocs
    .filter(t => t && t.teamNumber)
    .sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0))

  const scorecards = scorecardDocs
    .filter(sc => sc && sc.status === 'final' && sc.week && sc.teamA && sc.teamB)
    .sort((a, b) => (a.week || 0) - (b.week || 0))

  const statsMap = {}
  for (const t of teams) {
    statsMap[t.teamNumber] = {
      teamNumber: t.teamNumber, teamName: t.teamName || '',
      player1Email: t.player1Email, player2Email: t.player2Email,
      totalPoints: 0, p1Points: 0, p2Points: 0,
      wins: 0, losses: 0, ties: 0, history: []
    }
  }

  for (const sc of scorecards) {
    const { week, teamA: scTeamA, teamB: scTeamB, players: allPlayers, date } = sc
    if (!Array.isArray(allPlayers) || allPlayers.length < 4) continue

    const tA = teams.find(t => t.teamNumber === scTeamA)
    const tB = teams.find(t => t.teamNumber === scTeamB)
    if (!tA || !tB) continue

    const isOnTeamA = (email) => { const e = lowerEmail(email); return e === lowerEmail(tA.player1Email) || e === lowerEmail(tA.player2Email) }
    const isOnTeamB = (email) => { const e = lowerEmail(email); return e === lowerEmail(tB.player1Email) || e === lowerEmail(tB.player2Email) }

    const teamAPlayers = allPlayers.filter(p => p && p.email && isOnTeamA(p.email))
    const teamBPlayers = allPlayers.filter(p => p && p.email && isOnTeamB(p.email))
    if (teamAPlayers.length < 2 || teamBPlayers.length < 2) continue

    teamAPlayers.sort((a, b) => (a.handicapSnapshot || 0) - (b.handicapSnapshot || 0))
    teamBPlayers.sort((a, b) => (a.handicapSnapshot || 0) - (b.handicapSnapshot || 0))

    const lowA = teamAPlayers[0], highA = teamAPlayers[1]
    const lowB = teamBPlayers[0], highB = teamBPlayers[1]

    const low = computeSubMatch(lowA, lowB)
    const high = computeSubMatch(highA, highB)

    const totalA = low.ptA + high.ptA
    const totalB = low.ptB + high.ptB

    const teamAResult = subResult(totalA, totalB)
    const teamBResult = subResult(totalB, totalA)

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
      s.p1Points += p1Pts; s.p2Points += p2Pts; s.totalPoints += teamTotalPts
      if (teamResult === 'W') s.wins++
      else if (teamResult === 'L') s.losses++
      else s.ties++
      s.history.push({
        week, date: date || null, opponent: oppNum,
        opponentName: (oppTeam && oppTeam.teamName) ? oppTeam.teamName : `Team ${oppNum}`,
        p1Email: p1.email, p1Name: p1.name || p1.email, p1Result, p1Pts,
        p2Email: p2.email, p2Name: p2.name || p2.email, p2Result, p2Pts,
        teamPoints: teamTotalPts, teamResult
      })
    }

    buildTeamEntry(scTeamA, tA, lowA, highA, low.ptA, high.ptA, low.ptB, high.ptB, totalA, teamAResult)
    buildTeamEntry(scTeamB, tB, lowB, highB, low.ptB, high.ptB, low.ptA, high.ptA, totalB, teamBResult)
  }

  const standings = Object.values(statsMap)
  for (const t of standings) t.history.sort((a, b) => (a.week || 0) - (b.week || 0))
  standings.sort((a, b) => b.totalPoints - a.totalPoints)

  return Response.json({ standings })
}

export const config = { path: '/api/team-leaderboard' }
