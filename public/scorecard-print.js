/* ══════════════════════════════════════════════════════════════════════
   scorecard-print.js — Fairway Command 2-Man Team League Scorecard
   Generates landscape 5×7 match scorecards with Low / High HCP pairings.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── Utility helpers ──────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso)
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function sideLabel(side) {
    if (side === 'back')                          return 'Back 9';
    if (side === 'both' || side === 'full' || side === '18') return '18 Hole';
    return 'Front 9';
  }

  /* ── Cache accessors ──────────────────────────────────────────────── */

  function leagueName() {
    const s = (typeof leagueSettingsGlobal !== 'undefined') ? leagueSettingsGlobal : null;
    return (s && s.leagueName) ? s.leagueName : 'Fairway Command League';
  }

  function getPlayer(email) {
    if (!email) return null;
    const pool = (typeof playersCache !== 'undefined' && Array.isArray(playersCache)) ? playersCache : [];
    const e = String(email).trim().toLowerCase();
    return pool.find(p => p && String(p.email || '').trim().toLowerCase() === e) || null;
  }

  function getTeam(num) {
    if (!num) return null;
    const pool = (typeof teamsCache !== 'undefined' && Array.isArray(teamsCache)) ? teamsCache : [];
    return pool.find(t => t && Number(t.teamNumber) === Number(num)) || null;
  }

  function teamDisplayName(team, num) {
    if (!team) return 'Team ' + num;
    return team.teamName ? team.teamName : ('Team ' + team.teamNumber);
  }

  function playerHcp(player) {
    if (!player) return 0;
    const h = player.handicap !== undefined ? player.handicap
            : player.hdcp    !== undefined ? player.hdcp : 0;
    return Number(h) || 0;
  }

  /* Pair a team's two players into { low, high } by handicap */
  function pairTeam(team) {
    if (!team) return { low: null, high: null };
    const p1 = getPlayer(team.player1Email);
    const p2 = getPlayer(team.player2Email);
    if (!p1 && !p2) return { low: null, high: null };
    if (!p1) return { low: p2, high: null };
    if (!p2) return { low: p1, high: null };
    return playerHcp(p1) <= playerHcp(p2)
      ? { low: p1, high: p2 }
      : { low: p2, high: p1 };
  }

  /* Pull nine-hole course data; falls back to app global if available */
  function nineData(courseName, teeName, side) {
    if (typeof getActiveNineCourseData === 'function' && courseName) {
      try { return getActiveNineCourseData(courseName, teeName || '', side || 'front'); }
      catch (e) { /* fall through */ }
    }
    return null;
  }

  /* ── Ensure data caches are populated ─────────────────────────────── */

  async function ensureData() {
    const loaders = ['loadPlayers', 'loadTeams', 'loadScheduleCache', 'loadCourses', 'fetchLeagueSettingsGlobal'];
    for (const fn of loaders) {
      if (typeof global[fn] === 'function') {
        try { await global[fn](); } catch (_) { /* non-fatal */ }
      }
    }
  }

  /* ── HTML builder ─────────────────────────────────────────────────── */

  const DFLT_PARS = [4, 3, 5, 4, 3, 4, 4, 3, 4];
  const DFLT_HCP  = [5, 9, 1, 7, 3, 8, 2, 6, 4];
  const HOLES     = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  function buildHtml(opts) {
    const { lname, teamAName, teamBName, week, courseName, date, side, tee, lowA, lowB, highA, highB } = opts;

    const nine   = nineData(courseName, tee, side);
    const pars   = (nine && nine.pars   && nine.pars.length   === 9) ? nine.pars   : DFLT_PARS;
    const hcpIdx = (nine && nine.hcpIdx && nine.hcpIdx.length === 9) ? nine.hcpIdx : DFLT_HCP;
    const parTot = pars.reduce((a, b) => a + b, 0);

    const hdrCells = HOLES.map(h => `<th class="sc-h-col">${h}</th>`).join('')
                   + '<th class="sc-tot-col">Tot</th>';
    const parCells = pars.map(p => `<td>${p}</td>`).join('')
                   + `<td class="sc-par-tot">${parTot}</td>`;
    const hcpCells = hcpIdx.map(h => `<td>${h}</td>`).join('') + '<td></td>';

    /* Player data row: blank score cells for hand entry */
    function playerRow(player, tname, rowCls, totCls) {
      const name  = player ? esc(player.name || player.email || '—') : '—';
      const hcp   = playerHcp(player);
      const cells = HOLES.map(() => '<td class="sc-score-cell"></td>').join('');
      return `
        <tr class="sc-p-row ${rowCls}">
          <td class="sc-p-label">
            <span class="sc-p-name">${name}<span class="sc-p-hcp"> (${hcp})</span></span>
            <span class="sc-p-team">${esc(tname)}</span>
          </td>
          ${cells}
          <td class="sc-score-cell ${totCls}"></td>
        </tr>`;
    }

    /* Points row: all cells blank for writing */
    function ptsRow(totCls) {
      const cells = HOLES.map(() => '<td class="sc-score-cell"></td>').join('');
      return `
        <tr class="sc-pts-row">
          <td class="sc-lbl sc-pts-lbl">Points</td>
          ${cells}
          <td class="sc-score-cell ${totCls}"></td>
        </tr>`;
    }

    return `
<div class="sc-card">

  <!-- ══ HEADER ═══════════════════════════════════════════════════ -->
  <div class="sc-header">
    <div class="sc-logo-wrap">
      <img class="sc-logo" src="/FairwayCommand_logo_transparent.png" alt="FC" />
    </div>
    <div class="sc-header-info">
      <div class="sc-league-name">${esc(lname.toUpperCase())}</div>
      <div class="sc-matchup">${esc(teamAName)} vs ${esc(teamBName)} &nbsp;&middot;&nbsp; Week&nbsp;${week}</div>
      <div class="sc-course-date">${esc(courseName || '—')} &nbsp;&middot;&nbsp; ${esc(fmtDate(date))}</div>
      <div class="sc-side-badge">${esc(sideLabel(side))}</div>
    </div>
  </div>

  <!-- ══ SCORE TABLE ══════════════════════════════════════════════ -->
  <table class="sc-table">
    <thead>
      <tr class="sc-hole-hdr">
        <th class="sc-lbl-col">Hole</th>
        ${hdrCells}
      </tr>
    </thead>
    <tbody>

      <!-- Hole info rows -->
      <tr class="sc-par-row">
        <td class="sc-lbl">Par</td>${parCells}
      </tr>
      <tr class="sc-hcp-row">
        <td class="sc-lbl">HCP</td>${hcpCells}
      </tr>

      <!-- ── LOW HANDICAP PAIRING ──────────────────────────────── -->
      <tr class="sc-sec-bar sc-sec-low">
        <td colspan="11">Low Handicap Pairing</td>
      </tr>
      ${playerRow(lowA, teamAName, 'sc-p-white',  'sc-tot-p1')}
      ${playerRow(lowB, teamBName, 'sc-p-stripe', 'sc-tot-p2')}
      ${ptsRow('sc-tot-pts')}

      <!-- Thin divider between sections -->
      <tr class="sc-divider"><td colspan="11"></td></tr>

      <!-- ── HIGH HANDICAP PAIRING ─────────────────────────────── -->
      <tr class="sc-sec-bar sc-sec-high">
        <td colspan="11">High Handicap Pairing</td>
      </tr>
      ${playerRow(highA, teamAName, 'sc-p-white',  'sc-tot-p1')}
      ${playerRow(highB, teamBName, 'sc-p-stripe', 'sc-tot-p2')}
      ${ptsRow('sc-tot-pts')}

    </tbody>
  </table>

  <!-- ══ RESULT FOOTER ═══════════════════════════════════════════ -->
  <div class="sc-footer">
    <div class="sc-foot-team">
      <span class="sc-foot-team-name">${esc(teamAName)}</span>
      <span class="sc-foot-pts-label">Points<span class="sc-foot-pts-line"></span></span>
    </div>
    <div class="sc-foot-divider"></div>
    <div class="sc-foot-team">
      <span class="sc-foot-team-name">${esc(teamBName)}</span>
      <span class="sc-foot-pts-label">Points<span class="sc-foot-pts-line"></span></span>
    </div>
  </div>

</div>`;
  }

  /* ── Build HTML for all matches in a schedule week ─────────────── */

  function buildWeekHtml(sw) {
    const lname   = leagueName();
    const side    = (sw && sw.side)    || 'front';
    const course  = (sw && sw.course)  || '';
    const date    = (sw && sw.date)    || '';
    const tee     = (sw && sw.tee)     || '';
    const week    = (sw && sw.week)    || '—';
    const matches = (sw && Array.isArray(sw.matches))
      ? sw.matches.filter(m => m && m.teamA && m.teamB) : [];

    if (!matches.length) return null;

    return matches.map(m => {
      const teamA = getTeam(m.teamA);
      const teamB = getTeam(m.teamB);
      const { low: lowA, high: highA } = pairTeam(teamA);
      const { low: lowB, high: highB } = pairTeam(teamB);
      return buildHtml({
        lname,
        teamAName: teamDisplayName(teamA, m.teamA),
        teamBName: teamDisplayName(teamB, m.teamB),
        week, courseName: course, date, side, tee,
        lowA, lowB, highA, highB
      });
    }).join('');
  }

  /* ══ Public API ══════════════════════════════════════════════════════

     printWeekMatchScorecards(week)
       → Prints all match scorecards for a given schedule week number.
         Callable from the Schedule page's Print button.

     printMatchScorecard(week, teamANum, teamBNum)
       → Prints a single match scorecard for the specified team pair.
  ══════════════════════════════════════════════════════════════════════ */

  global.printWeekMatchScorecards = async function (week) {
    const root = document.getElementById('print-root');
    if (!root) { console.error('sc-print: #print-root not found'); return; }

    if (typeof showToast === 'function') showToast('Building scorecards…');
    await ensureData();

    const cache = (typeof scheduleCache !== 'undefined' && Array.isArray(scheduleCache)) ? scheduleCache : [];
    const sw = cache.find(w => w && Number(w.week) === Number(week)) || null;

    if (!sw || (sw.type && sw.type !== 'match')) {
      if (typeof showToast === 'function') showToast('No match schedule for Week ' + week);
      return;
    }

    /* If schedule week has no matches array, fall back to match-scorecards API
       (seeded leagues store pairings separately, not in the schedule record). */
    let swResolved = sw;
    const hasMatches = Array.isArray(sw.matches) && sw.matches.some(m => m && m.teamA && m.teamB);
    if (!hasMatches && typeof fetchJson === 'function') {
      try {
        const res = await fetchJson('/api/match-scorecards?week=' + encodeURIComponent(week));
        const scorecards = res && Array.isArray(res.scorecards) ? res.scorecards : [];
        const fallbackMatches = scorecards
          .map(sc => ({ teamA: sc && sc.teamA ? Number(sc.teamA) : 0, teamB: sc && sc.teamB ? Number(sc.teamB) : 0 }))
          .filter(m => m.teamA && m.teamB);
        if (fallbackMatches.length) swResolved = Object.assign({}, sw, { matches: fallbackMatches });
      } catch (_) { /* non-fatal */ }
    }

    const html = buildWeekHtml(swResolved);
    if (!html) {
      if (typeof showToast === 'function') showToast('No team matchups for Week ' + week + '. Add matches in Schedule first.');
      return;
    }

    root.innerHTML = html;
    setTimeout(() => { window.print(); }, 150);
  };

  global.printMatchScorecard = async function (week, teamANum, teamBNum) {
    const root = document.getElementById('print-root');
    if (!root) { console.error('sc-print: #print-root not found'); return; }

    if (typeof showToast === 'function') showToast('Building scorecard…');
    await ensureData();

    const cache = (typeof scheduleCache !== 'undefined' && Array.isArray(scheduleCache)) ? scheduleCache : [];
    const sw    = cache.find(w => w && Number(w.week) === Number(week)) || null;
    const lname  = leagueName();
    const side   = (sw && sw.side)   || 'front';
    const course = (sw && sw.course) || '';
    const date   = (sw && sw.date)   || '';
    const tee    = (sw && sw.tee)    || '';

    const teamA = getTeam(teamANum);
    const teamB = getTeam(teamBNum);
    const { low: lowA, high: highA } = pairTeam(teamA);
    const { low: lowB, high: highB } = pairTeam(teamB);

    root.innerHTML = buildHtml({
      lname,
      teamAName: teamDisplayName(teamA, teamANum),
      teamBName: teamDisplayName(teamB, teamBNum),
      week, courseName: course, date, side, tee,
      lowA, lowB, highA, highB
    });

    setTimeout(() => { window.print(); }, 150);
  };

})(window);
