document.addEventListener('DOMContentLoaded', function () {
  var sidebarButtons = document.querySelectorAll('.sidebar-btn');
  var views = document.querySelectorAll('.view');
  var menuToggle = document.querySelector('.menu-toggle');
  var sidebar = document.querySelector('.sidebar');

  // Create overlay for mobile
  var overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function showView(viewId) {
    views.forEach(function (view) {
      view.classList.remove('active');
    });
    sidebarButtons.forEach(function (btn) {
      btn.classList.remove('active');
    });

    var target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
    }

    sidebarButtons.forEach(function (btn) {
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('active');
      }
    });

    window.location.hash = viewId;

    // Close sidebar on mobile after selecting
    closeSidebar();
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  // Sidebar navigation
  sidebarButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      showView(btn.getAttribute('data-view'));
    });
  });

  // Mobile menu toggle
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
  }

  // Close sidebar when clicking overlay
  overlay.addEventListener('click', closeSidebar);

  // On load: use hash if present, otherwise default to dashboard
  var hash = window.location.hash.replace('#', '');
  var validViews = ['dashboard', 'season-overview', 'leaderboard', 'schedule', 'enter-scores', 'players', 'analytics', 'payments', 'courses', 'league-chat', 'instructions', 'admin'];

  if (hash && validViews.indexOf(hash) !== -1) {
    showView(hash);
  } else {
    showView('dashboard');
  }

  // =============================================
  // PRINT SCORE CARDS FEATURE
  // =============================================

  // 20 two-man teams with players and handicaps
  var leagueTeams = [
    { id: 1, name: 'Team 1', players: [{ name: 'Tom Davis', hcp: 4.2 }, { name: 'Mike Johnson', hcp: 5.1 }] },
    { id: 2, name: 'Team 2', players: [{ name: 'Dave Wilson', hcp: 5.8 }, { name: 'Chris Brown', hcp: 7.9 }] },
    { id: 3, name: 'Team 3', players: [{ name: 'Steve Williams', hcp: 6.5 }, { name: 'Rob Taylor', hcp: 8.8 }] },
    { id: 4, name: 'Team 4', players: [{ name: 'John Martinez', hcp: 8.4 }, { name: 'Dan Anderson', hcp: 9.2 }] },
    { id: 5, name: 'Team 5', players: [{ name: 'Mark Thomas', hcp: 9.7 }, { name: 'Jeff Clark', hcp: 10.1 }] },
    { id: 6, name: 'Team 6', players: [{ name: 'Bill Harris', hcp: 3.5 }, { name: 'Paul Lewis', hcp: 6.3 }] },
    { id: 7, name: 'Team 7', players: [{ name: 'Gary Walker', hcp: 7.0 }, { name: 'Rick Hall', hcp: 11.2 }] },
    { id: 8, name: 'Team 8', players: [{ name: 'Jim Allen', hcp: 4.8 }, { name: 'Bob Young', hcp: 8.0 }] },
    { id: 9, name: 'Team 9', players: [{ name: 'Ray King', hcp: 10.5 }, { name: 'Ed Wright', hcp: 13.4 }] },
    { id: 10, name: 'Team 10', players: [{ name: 'Sam Lopez', hcp: 5.3 }, { name: 'Joe Hill', hcp: 7.6 }] },
    { id: 11, name: 'Team 11', players: [{ name: 'Carl Scott', hcp: 6.1 }, { name: 'Ron Green', hcp: 9.9 }] },
    { id: 12, name: 'Team 12', players: [{ name: 'Al Adams', hcp: 11.0 }, { name: 'Pete Baker', hcp: 14.2 }] },
    { id: 13, name: 'Team 13', players: [{ name: 'Ken Nelson', hcp: 3.8 }, { name: 'Lee Carter', hcp: 5.5 }] },
    { id: 14, name: 'Team 14', players: [{ name: 'Don Mitchell', hcp: 8.7 }, { name: 'Tim Perez', hcp: 12.3 }] },
    { id: 15, name: 'Team 15', players: [{ name: 'Vic Roberts', hcp: 7.4 }, { name: 'Hank Turner', hcp: 10.8 }] },
    { id: 16, name: 'Team 16', players: [{ name: 'Walt Phillips', hcp: 4.0 }, { name: 'Fred Campbell', hcp: 6.7 }] },
    { id: 17, name: 'Team 17', players: [{ name: 'Ned Parker', hcp: 9.0 }, { name: 'Gus Evans', hcp: 11.5 }] },
    { id: 18, name: 'Team 18', players: [{ name: 'Max Edwards', hcp: 5.0 }, { name: 'Roy Collins', hcp: 7.2 }] },
    { id: 19, name: 'Team 19', players: [{ name: 'Len Stewart', hcp: 12.0 }, { name: 'Art Sanchez', hcp: 15.1 }] },
    { id: 20, name: 'Team 20', players: [{ name: 'Bud Morris', hcp: 6.9 }, { name: 'Cal Rogers', hcp: 8.5 }] }
  ];

  // Course data with hole-by-hole info for front and back 9
  var courseData = {
    'Pine Valley Golf Club': {
      front: {
        holes:  [1, 2, 3, 4, 5, 6, 7, 8, 9],
        par:    [4, 3, 5, 4, 4, 3, 5, 4, 4],
        hdcp:   [7, 15, 1, 9, 3, 17, 5, 11, 13],
        yards:  [385, 165, 520, 410, 390, 155, 535, 375, 365]
      },
      back: {
        holes:  [10, 11, 12, 13, 14, 15, 16, 17, 18],
        par:    [4, 5, 3, 4, 4, 5, 3, 4, 4],
        hdcp:   [8, 2, 16, 6, 4, 10, 18, 12, 14],
        yards:  [400, 545, 170, 425, 405, 510, 145, 380, 345]
      }
    },
    'Oak Ridge Country Club': {
      front: {
        holes:  [1, 2, 3, 4, 5, 6, 7, 8, 9],
        par:    [4, 4, 3, 5, 4, 4, 3, 4, 5],
        hdcp:   [5, 9, 17, 1, 7, 3, 15, 11, 13],
        yards:  [370, 355, 150, 510, 385, 400, 160, 340, 490]
      },
      back: {
        holes:  [10, 11, 12, 13, 14, 15, 16, 17, 18],
        par:    [4, 3, 4, 5, 4, 4, 3, 5, 4],
        hdcp:   [6, 16, 8, 2, 10, 4, 18, 14, 12],
        yards:  [380, 155, 365, 525, 390, 410, 140, 500, 360]
      }
    },
    'Lakeside Golf Course': {
      front: {
        holes:  [1, 2, 3, 4, 5, 6, 7, 8, 9],
        par:    [4, 5, 3, 4, 4, 5, 3, 4, 4],
        hdcp:   [3, 1, 13, 7, 5, 9, 17, 11, 15],
        yards:  [410, 555, 175, 395, 420, 530, 165, 385, 365]
      },
      back: {
        holes:  [10, 11, 12, 13, 14, 15, 16, 17, 18],
        par:    [5, 4, 3, 4, 4, 5, 4, 3, 4],
        hdcp:   [2, 6, 18, 8, 4, 10, 12, 16, 14],
        yards:  [540, 405, 150, 400, 430, 520, 375, 160, 345]
      }
    }
  };

  // Pre-made weekly schedule: 10 matches per week (5 front, 5 back)
  var weeklySchedule = [
    { week: 1, date: 'Apr 5, 2026', course: 'Pine Valley Golf Club',
      front: [[1,2],[3,4],[5,6],[7,8],[9,10]],
      back:  [[11,12],[13,14],[15,16],[17,18],[19,20]] },
    { week: 2, date: 'Apr 12, 2026', course: 'Oak Ridge Country Club',
      front: [[1,3],[2,5],[4,7],[6,9],[8,11]],
      back:  [[10,13],[12,15],[14,17],[16,19],[18,20]] },
    { week: 3, date: 'Apr 19, 2026', course: 'Lakeside Golf Course',
      front: [[1,4],[2,6],[3,8],[5,10],[7,12]],
      back:  [[9,14],[11,16],[13,18],[15,20],[17,19]] },
    { week: 4, date: 'Apr 26, 2026', course: 'Pine Valley Golf Club',
      front: [[1,5],[2,7],[3,9],[4,11],[6,13]],
      back:  [[8,15],[10,17],[12,19],[14,20],[16,18]] },
    { week: 5, date: 'May 3, 2026', course: 'Oak Ridge Country Club',
      front: [[1,6],[2,8],[3,10],[4,12],[5,14]],
      back:  [[7,16],[9,18],[11,20],[13,19],[15,17]] },
    { week: 6, date: 'May 10, 2026', course: 'Lakeside Golf Course',
      front: [[1,7],[2,9],[3,11],[4,13],[5,15]],
      back:  [[6,17],[8,19],[10,20],[12,18],[14,16]] },
    { week: 7, date: 'May 17, 2026', course: 'Pine Valley Golf Club',
      front: [[1,8],[2,10],[3,12],[4,14],[5,16]],
      back:  [[6,18],[7,20],[9,19],[11,17],[13,15]] },
    { week: 8, date: 'May 24, 2026', course: 'Oak Ridge Country Club',
      front: [[1,9],[2,11],[3,13],[4,15],[5,17]],
      back:  [[6,19],[7,18],[8,20],[10,16],[12,14]] },
    { week: 9, date: 'May 31, 2026', course: 'Lakeside Golf Course',
      front: [[1,10],[2,12],[3,14],[4,16],[5,18]],
      back:  [[6,20],[7,19],[8,17],[9,15],[11,13]] },
    { week: 10, date: 'Jun 7, 2026', course: 'Pine Valley Golf Club',
      front: [[1,11],[2,13],[3,15],[4,17],[5,19]],
      back:  [[6,16],[7,14],[8,12],[9,20],[10,18]] }
  ];

  // Store admin overrides
  var matchOverrides = {};

  function getTeamById(id) {
    for (var i = 0; i < leagueTeams.length; i++) {
      if (leagueTeams[i].id === id) return leagueTeams[i];
    }
    return null;
  }

  // Sort players in a team: lowest HCP first
  function getSortedPlayers(team) {
    var players = team.players.slice();
    players.sort(function(a, b) { return a.hcp - b.hcp; });
    return players;
  }

  // Calculate 9-hole league handicap (half of 18-hole, rounded)
  function get9HoleHcp(hcp18) {
    return Math.round((hcp18 / 2) * 10) / 10;
  }

  // Build match pairings for a single 2-team match
  function buildMatchPairings(teamAId, teamBId, side, matchIndex, weekNum) {
    var teamA = getTeamById(teamAId);
    var teamB = getTeamById(teamBId);
    if (!teamA || !teamB) return null;

    var overrideKey = weekNum + '-' + matchIndex + '-' + side;
    var override = matchOverrides[overrideKey] || {};

    var playersA = getSortedPlayers(teamA);
    var playersB = getSortedPlayers(teamB);

    // Low HCP match: lowest from each team
    var lowA = override.player1 ? override.player1 : { name: playersA[0].name, hcp: playersA[0].hcp };
    var lowB = override.player1Opp ? override.player1Opp : { name: playersB[0].name, hcp: playersB[0].hcp };

    // High HCP match: higher from each team
    var highA = override.player2 ? override.player2 : { name: playersA[1].name, hcp: playersA[1].hcp };
    var highB = override.player2Opp ? override.player2Opp : { name: playersB[1].name, hcp: playersB[1].hcp };

    if (override.hcp1A !== undefined) lowA.hcp = override.hcp1A;
    if (override.hcp1B !== undefined) lowB.hcp = override.hcp1B;
    if (override.hcp2A !== undefined) highA.hcp = override.hcp2A;
    if (override.hcp2B !== undefined) highB.hcp = override.hcp2B;

    return {
      teamA: teamA,
      teamB: teamB,
      side: override.side || side,
      lowMatch: { playerA: lowA, playerB: lowB },
      highMatch: { playerA: highA, playerB: highB }
    };
  }

  // Determine which holes a player gets strokes on
  function getStrokeHoles(playerHcp, opponentHcp, holeHdcps) {
    var hcp9A = get9HoleHcp(playerHcp);
    var hcp9B = get9HoleHcp(opponentHcp);
    var diff = Math.round(hcp9A - hcp9B);

    // Higher HCP gets strokes; the difference tells how many
    var strokesReceived = diff > 0 ? diff : 0;
    var strokeHoles = [];

    if (strokesReceived > 0) {
      // Sort holes by handicap ranking (hardest first = lowest hdcp number)
      var ranked = holeHdcps.map(function(h, i) { return { idx: i, hdcp: h }; });
      ranked.sort(function(a, b) { return a.hdcp - b.hdcp; });
      for (var s = 0; s < Math.min(strokesReceived, 9); s++) {
        strokeHoles.push(ranked[s].idx);
      }
    }

    return strokeHoles;
  }

  function getStrokeHolesForOpponent(playerHcp, opponentHcp, holeHdcps) {
    return getStrokeHoles(opponentHcp, playerHcp, holeHdcps);
  }

  // Render a single scorecard HTML
  function renderScorecard(match, side, courseInfo, matchDate, courseName) {
    var sideData = side === 'front' ? courseInfo.front : courseInfo.back;
    var sideLabel = side === 'front' ? 'Front Nine (Holes 1–9)' : 'Back Nine (Holes 10–18)';
    var totalPar = sideData.par.reduce(function(a, b) { return a + b; }, 0);

    function buildPlayerCard(playerA, playerB) {
      var hcp9A = get9HoleHcp(playerA.hcp);
      var hcp9B = get9HoleHcp(playerB.hcp);

      // Determine who gets strokes from whom
      var strokesForA = getStrokeHoles(playerA.hcp, playerB.hcp, sideData.hdcp);
      var strokesForB = getStrokeHolesForOpponent(playerA.hcp, playerB.hcp, sideData.hdcp);

      var html = '<div class="scorecard">';
      html += '<div class="scorecard-header">';
      html += '<div class="scorecard-date">' + matchDate + '</div>';
      html += '<div class="scorecard-side">' + sideLabel + '</div>';
      html += '<div class="scorecard-course">' + courseName + '</div>';
      html += '<div class="scorecard-teams">' + match.teamA.name + ' vs ' + match.teamB.name + '</div>';
      html += '</div>';

      html += '<table class="scorecard-table">';

      // Hole numbers row
      html += '<thead><tr class="sc-hole-row"><th class="sc-label">Hole</th>';
      for (var h = 0; h < 9; h++) {
        html += '<th>' + sideData.holes[h] + '</th>';
      }
      html += '<th>Total</th></tr></thead>';

      html += '<tbody>';

      // Yardage row
      html += '<tr class="sc-yards-row"><td class="sc-label">Yards</td>';
      var totalYards = 0;
      for (var y = 0; y < 9; y++) {
        html += '<td>' + sideData.yards[y] + '</td>';
        totalYards += sideData.yards[y];
      }
      html += '<td>' + totalYards + '</td></tr>';

      // Par row
      html += '<tr class="sc-par-row"><td class="sc-label">Par</td>';
      for (var p = 0; p < 9; p++) {
        html += '<td>' + sideData.par[p] + '</td>';
      }
      html += '<td>' + totalPar + '</td></tr>';

      // Handicap row
      html += '<tr class="sc-hdcp-row"><td class="sc-label">Hdcp</td>';
      for (var hd = 0; hd < 9; hd++) {
        html += '<td>' + sideData.hdcp[hd] + '</td>';
      }
      html += '<td></td></tr>';

      // Player A row with stroke dots
      html += '<tr class="sc-player-row"><td class="sc-label sc-player-name">' + playerA.name + ' (' + hcp9A + ')</td>';
      for (var a = 0; a < 9; a++) {
        var dotA = strokesForA.indexOf(a) !== -1 ? '<span class="stroke-dot">&#9679;</span>' : '';
        html += '<td class="sc-score-cell">' + dotA + '<span class="sc-score-blank"></span></td>';
      }
      html += '<td class="sc-score-cell"><span class="sc-score-blank"></span></td></tr>';

      // Player B row with stroke dots
      html += '<tr class="sc-player-row"><td class="sc-label sc-player-name">' + playerB.name + ' (' + hcp9B + ')</td>';
      for (var b = 0; b < 9; b++) {
        var dotB = strokesForB.indexOf(b) !== -1 ? '<span class="stroke-dot">&#9679;</span>' : '';
        html += '<td class="sc-score-cell">' + dotB + '<span class="sc-score-blank"></span></td>';
      }
      html += '<td class="sc-score-cell"><span class="sc-score-blank"></span></td></tr>';

      html += '</tbody></table>';
      html += '</div>';
      return html;
    }

    // Two scorecards per match: low HCP pairing and high HCP pairing
    var lowCard = buildPlayerCard(match.lowMatch.playerA, match.lowMatch.playerB);
    var highCard = buildPlayerCard(match.highMatch.playerA, match.highMatch.playerB);

    return '<div class="scorecard-pair">' +
      '<div class="scorecard-pair-label">Low Handicap Match</div>' + lowCard +
      '<div class="scorecard-pair-label">High Handicap Match</div>' + highCard +
      '</div>';
  }

  // Populate week selector
  var weekSelect = document.getElementById('sc-week');
  if (weekSelect) {
    weeklySchedule.forEach(function(w) {
      var opt = document.createElement('option');
      opt.value = w.week;
      opt.textContent = 'Week ' + w.week + ' — ' + w.date + ' (' + w.course + ')';
      weekSelect.appendChild(opt);
    });

    weekSelect.addEventListener('change', function() {
      var weekNum = parseInt(this.value);
      var container = document.getElementById('sc-matches-container');
      var frontDiv = document.getElementById('sc-front-matches');
      var backDiv = document.getElementById('sc-back-matches');
      var overrideSelect = document.getElementById('sc-override-match');

      if (!weekNum) {
        container.style.display = 'none';
        return;
      }

      container.style.display = 'block';
      var week = weeklySchedule[weekNum - 1];

      // Populate date override with week's date
      var dateOverride = document.getElementById('sc-date-override');
      if (dateOverride && !dateOverride.value) {
        // Parse the date for the input
        var d = new Date(week.date);
        if (!isNaN(d.getTime())) {
          dateOverride.value = d.toISOString().split('T')[0];
        }
      }

      // Show front 9 matches
      frontDiv.innerHTML = '';
      week.front.forEach(function(pair, idx) {
        var tA = getTeamById(pair[0]);
        var tB = getTeamById(pair[1]);
        var div = document.createElement('div');
        div.className = 'sc-match-item';
        div.textContent = (idx + 1) + '. ' + tA.name + ' vs ' + tB.name;
        frontDiv.appendChild(div);
      });

      // Show back 9 matches
      backDiv.innerHTML = '';
      week.back.forEach(function(pair, idx) {
        var tA = getTeamById(pair[0]);
        var tB = getTeamById(pair[1]);
        var div = document.createElement('div');
        div.className = 'sc-match-item';
        div.textContent = (idx + 1) + '. ' + tA.name + ' vs ' + tB.name;
        backDiv.appendChild(div);
      });

      // Populate override match selector
      overrideSelect.innerHTML = '<option value="">Select a match...</option>';
      week.front.forEach(function(pair, idx) {
        var tA = getTeamById(pair[0]);
        var tB = getTeamById(pair[1]);
        var opt = document.createElement('option');
        opt.value = 'front-' + idx;
        opt.textContent = 'Front #' + (idx + 1) + ': ' + tA.name + ' vs ' + tB.name;
        overrideSelect.appendChild(opt);
      });
      week.back.forEach(function(pair, idx) {
        var tA = getTeamById(pair[0]);
        var tB = getTeamById(pair[1]);
        var opt = document.createElement('option');
        opt.value = 'back-' + idx;
        opt.textContent = 'Back #' + (idx + 1) + ': ' + tA.name + ' vs ' + tB.name;
        overrideSelect.appendChild(opt);
      });
    });
  }

  // Override match selector
  var overrideMatchSelect = document.getElementById('sc-override-match');
  if (overrideMatchSelect) {
    overrideMatchSelect.addEventListener('change', function() {
      var fields = document.getElementById('sc-override-fields');
      if (this.value) {
        fields.style.display = 'block';
        // Populate player selects with all league players
        var p1 = document.getElementById('sc-override-player1');
        var p2 = document.getElementById('sc-override-player2');
        p1.innerHTML = '<option value="">-- Keep default --</option>';
        p2.innerHTML = '<option value="">-- Keep default --</option>';
        leagueTeams.forEach(function(team) {
          team.players.forEach(function(player) {
            var opt1 = document.createElement('option');
            opt1.value = player.name + '|' + player.hcp;
            opt1.textContent = player.name + ' (' + player.hcp + ')';
            p1.appendChild(opt1);
            var opt2 = opt1.cloneNode(true);
            p2.appendChild(opt2);
          });
        });
      } else {
        fields.style.display = 'none';
      }
    });
  }

  // Apply override
  var applyOverrideBtn = document.getElementById('sc-apply-override');
  if (applyOverrideBtn) {
    applyOverrideBtn.addEventListener('click', function() {
      var weekNum = parseInt(document.getElementById('sc-week').value);
      var matchVal = document.getElementById('sc-override-match').value;
      if (!weekNum || !matchVal) return;

      var parts = matchVal.split('-');
      var side = parts[0];
      var idx = parseInt(parts[1]);
      var overrideKey = weekNum + '-' + idx + '-' + side;

      var p1Val = document.getElementById('sc-override-player1').value;
      var p2Val = document.getElementById('sc-override-player2').value;
      var hcp1 = document.getElementById('sc-override-hcp1').value;
      var hcp2 = document.getElementById('sc-override-hcp2').value;
      var sideOverride = document.getElementById('sc-override-side').value;

      var ov = matchOverrides[overrideKey] || {};

      if (p1Val) {
        var p1Parts = p1Val.split('|');
        ov.player1 = { name: p1Parts[0], hcp: parseFloat(p1Parts[1]) };
      }
      if (p2Val) {
        var p2Parts = p2Val.split('|');
        ov.player2 = { name: p2Parts[0], hcp: parseFloat(p2Parts[1]) };
      }
      if (hcp1) ov.hcp1A = parseFloat(hcp1);
      if (hcp2) ov.hcp2A = parseFloat(hcp2);
      if (sideOverride) ov.side = sideOverride;

      matchOverrides[overrideKey] = ov;
      alert('Override applied for ' + side + ' match #' + (idx + 1) + ' in Week ' + weekNum);
    });
  }

  function generateAllScorecards() {
    var weekNum = parseInt(document.getElementById('sc-week').value);
    if (!weekNum) { alert('Please select a match week.'); return null; }

    var week = weeklySchedule[weekNum - 1];
    var course = courseData[week.course];
    if (!course) { alert('Course data not found for ' + week.course); return null; }

    var dateOverride = document.getElementById('sc-date-override').value;
    var matchDate = dateOverride ? new Date(dateOverride + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : week.date;

    var allCards = '';

    // Front 9 matches
    week.front.forEach(function(pair, idx) {
      var pairings = buildMatchPairings(pair[0], pair[1], 'front', idx, weekNum);
      if (pairings) {
        allCards += renderScorecard(pairings, pairings.side, course, matchDate, week.course);
      }
    });

    // Back 9 matches
    week.back.forEach(function(pair, idx) {
      var pairings = buildMatchPairings(pair[0], pair[1], 'back', idx, weekNum);
      if (pairings) {
        allCards += renderScorecard(pairings, pairings.side, course, matchDate, week.course);
      }
    });

    return allCards;
  }

  // Preview button
  var previewBtn = document.getElementById('sc-preview-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', function() {
      var html = generateAllScorecards();
      if (html) {
        var preview = document.getElementById('sc-preview-area');
        preview.innerHTML = '<h3 class="view-title" style="font-size:1.3rem;">Score Card Preview</h3>' + html;
        preview.style.display = 'block';
        preview.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Print button — builds a clean print document sized for 7×5 card stock
  var printBtn = document.getElementById('sc-print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', function() {
      var html = generateAllScorecards();
      if (!html) return;

      var printWin = window.open('', '_blank');
      if (!printWin) { alert('Please allow pop-ups for printing.'); return; }

      var printStyles = [
        '@page { size: 7in 5in; margin: 0.375in; }',
        '* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }',
        'html, body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding:0; margin:0; color:#000; width:6.25in; }',
        '.scorecard-pair { page-break-after:always; page-break-inside:avoid; margin:0; padding:0; width:6.25in; height:4.25in; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; }',
        '.scorecard-pair:last-child { page-break-after:avoid; }',
        '.scorecard-pair-label { font-size:7pt; font-weight:700; color:#1a472a; margin:2px 0 1px; border-bottom:1px solid #ccc; padding-bottom:1px; }',
        '.scorecard { border:1.5px solid #1a472a; border-radius:4px; margin-bottom:0; overflow:hidden; flex:1; }',
        '.scorecard-header { background:#1a472a; color:#fff; padding:2px 6px; display:flex; flex-wrap:wrap; gap:1px 8px; align-items:center; }',
        '.scorecard-header > div { font-size:7pt; }',
        '.scorecard-date { font-weight:700; }',
        '.scorecard-side { background:#c9a227; color:#1a1a2e; padding:1px 4px; border-radius:2px; font-weight:700; font-size:6.5pt !important; }',
        '.scorecard-course { font-style:italic; }',
        '.scorecard-teams { font-weight:600; }',
        '.scorecard-table { width:100%; border-collapse:collapse; }',
        '.scorecard-table th, .scorecard-table td { border:1px solid #999; padding:2px 3px; text-align:center; font-size:7.5pt; }',
        '.sc-label { text-align:left !important; font-weight:600; width:1in; min-width:0.9in; font-size:7pt; padding-left:3px !important; }',
        '.sc-player-name { color:#1a472a; }',
        '.sc-hole-row th { background:#1a472a; color:#fff; font-size:7.5pt; font-weight:600; }',
        '.sc-yards-row td { background:#f0f0f0; font-size:6.5pt; color:#666; }',
        '.sc-par-row td { background:#e8f5e9; font-weight:600; }',
        '.sc-hdcp-row td { background:#fff8e1; font-size:6.5pt; }',
        '.sc-player-row td { height:26px; position:relative; }',
        '.sc-score-cell { position:relative; }',
        '.stroke-dot { position:absolute; top:0; right:1px; color:#c9a227; font-size:7pt; line-height:1; }',
        '.sc-score-blank { display:inline-block; width:18px; border-bottom:1px solid #ccc; }'
      ].join('\n');

      printWin.document.write('<!DOCTYPE html><html><head><title>League Score Cards</title>');
      printWin.document.write('<style>' + printStyles + '</style></head><body>');
      printWin.document.write(html);
      printWin.document.write('</body></html>');
      printWin.document.close();

      // Wait for the document to fully render before triggering print
      printWin.onload = function() {
        printWin.focus();
        printWin.print();
        // Close the print window after printing completes (or is cancelled)
        printWin.onafterprint = function() {
          printWin.close();
        };
      };
    });
  }
});
