Content is user-generated and unverified.
1
// ============================================
// FAIRWAY COMMAND — The Ultimate League System
// ============================================

document.addEventListener('DOMContentLoaded', function () {

  // — LEAGUE DATA —
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

  // Course data with hole-by-hole info
  var courseData = {
    'Pine Valley Golf Club': {
      front: {
        holes: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        par: [4, 3, 5, 4, 4, 3, 5, 4, 4],
        hdcp: [7, 15, 1, 9, 3, 17, 5, 11, 13],
        yards: [385, 165, 520, 410, 390, 155, 535, 375, 365]
      },
      back: {
        holes: [10, 11, 12, 13, 14, 15, 16, 17, 18],
        par: [4, 5, 3, 4, 4, 5, 3, 4, 4],
        hdcp: [8, 2, 16, 6, 4, 10, 18, 12, 14],
        yards: [400, 545, 170, 425, 405, 510, 145, 380, 345]
      }
    },
    'Oak Ridge Country Club': {
      front: {
        holes: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        par: [4, 4, 3, 5, 4, 4, 3, 4, 5],
        hdcp: [5, 13, 17, 1, 9, 7, 15, 11, 3],
        yards: [370, 355, 145, 505, 385, 375, 140, 360, 495]
      },
      back: {
        holes: [10, 11, 12, 13, 14, 15, 16, 17, 18],
        par: [4, 3, 5, 4, 4, 3, 5, 4, 3],
        hdcp: [6, 16, 2, 10, 12, 18, 4, 8, 14],
        yards: [380, 155, 515, 395, 375, 150, 525, 390, 165]
      }
    },
    'Lakeside Golf Course': {
      front: {
        holes: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        par: [5, 4, 3, 4, 4, 5, 3, 4, 4],
        hdcp: [3, 9, 15, 7, 11, 1, 17, 5, 13],
        yards: [520, 395, 175, 410, 380, 545, 165, 415, 395]
      },
      back: {
        holes: [10, 11, 12, 13, 14, 15, 16, 17, 18],
        par: [4, 5, 3, 4, 5, 4, 3, 4, 4],
        hdcp: [4, 2, 16, 8, 6, 10, 18, 12, 14],
        yards: [405, 555, 160, 420, 530, 400, 155, 385, 395]
      }
    }
  };

  var weeklySchedule = [
    { week: 1, date: 'Apr 5, 2026', course: 'Pine Valley Golf Club', front: [[1,2],[3,4],[5,6],[7,8],[9,10]], back: [[11,12],[13,14],[15,16],[17,18],[19,20]] },
    { week: 2, date: 'Apr 12, 2026', course: 'Oak Ridge Country Club', front: [[1,3],[2,5],[4,7],[6,9],[8,11]], back: [[10,13],[12,15],[14,17],[16,19],[18,20]] },
    { week: 3, date: 'Apr 19, 2026', course: 'Lakeside Golf Course', front: [[1,4],[2,6],[3,8],[5,10],[7,12]], back: [[9,14],[11,16],[13,18],[15,20],[17,19]] },
    { week: 4, date: 'Apr 26, 2026', course: 'Pine Valley Golf Club', front: [[1,5],[2,7],[3,9],[4,11],[6,13]], back: [[8,15],[10,17],[12,19],[14,20],[16,18]] },
    { week: 5, date: 'May 3, 2026', course: 'Oak Ridge Country Club', front: [[1,6],[2,8],[3,10],[4,12],[5,14]], back: [[7,15],[9,16],[11,18],[13,20],[17,19]] },
    { week: 6, date: 'May 10, 2026', course: 'Lakeside Golf Course', front: [[1,7],[2,9],[3,11],[4,13],[5,15]], back: [[6,17],[8,18],[10,19],[12,20],[14,16]] },
    { week: 7, date: 'May 17, 2026', course: 'Pine Valley Golf Club', front: [[1,8],[2,10],[3,12],[4,14],[5,16]], back: [[6,18],[7,19],[9,20],[11,17],[13,15]] },
    { week: 8, date: 'May 24, 2026', course: 'Oak Ridge Country Club', front: [[1,9],[2,11],[3,13],[4,15],[5,17]], back: [[6,19],[7,20],[8,18],[10,16],[12,14]] },
    { week: 9, date: 'May 31, 2026', course: 'Lakeside Golf Course', front: [[1,10],[2,12],[3,14],[4,16],[5,18]], back: [[6,20],[7,19],[8,17],[9,15],[11,13]] },
    { week: 10, date: 'Jun 7, 2026', course: 'Pine Valley Golf Club', front: [[1,11],[2,13],[3,15],[4,17],[5,19]], back: [[6,16],[7,14],[8,12],[9,20],[10,18]] }
  ];

  var matchOverrides = {};
  var rainouts = [];

  // — CURRENT ROLE —
  var currentRole = 'admin';

  // — UTILITY —
  function getTeamById(id) {
    for (var i = 0; i < leagueTeams.length; i++) {
      if (leagueTeams[i].id === id) return leagueTeams[i];
    }
    return null;
  }

  function getSortedPlayers(team) {
    return team.players.slice().sort(function (a, b) { return a.hcp - b.hcp; });
  }

  function get9HoleHcp(hcp18) {
    return Math.round((hcp18 / 2) * 10) / 10;
  }

  // — ROLE CHECK HELPER —
  function requireRole(allowedRoles, actionName) {
    if (allowedRoles.indexOf(currentRole) === -1) {
      showToast('Access denied: ' + actionName + ' requires ' + allowedRoles.join(' or ') + ' role');
      return false;
    }
    return true;
  }

  // — TOAST —
  window.showToast = function (msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2800);
  };

  // — NAVIGATION —
  var sidebarButtons = document.querySelectorAll('.sidebar-btn[data-view]');
  var views = document.querySelectorAll('.view');

  function showView(viewId) {
    views.forEach(function (v) { v.classList.remove('active'); v.classList.remove('print-target'); });
    sidebarButtons.forEach(function (b) { b.classList.remove('active'); });
    var target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    sidebarButtons.forEach(function (b) {
      if (b.getAttribute('data-view') === viewId) b.classList.add('active');
    });
    if (window.innerWidth <= 700) document.getElementById('sidebar').classList.remove('open');
  }

  sidebarButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      showView(btn.getAttribute('data-view'));
    });
  });

  window.toggleSidebar = function () {
    document.getElementById('sidebar').classList.toggle('open');
  };

  // — ROLE SWITCHING —
  window.switchRole = function (role) {
    currentRole = role;

    sidebarButtons.forEach(function (btn) {
      var roles = btn.getAttribute('data-roles');
      if (!roles) {
        btn.classList.remove('hidden');
        return;
      }
      var allowed = roles.split(' ');
      if (allowed.indexOf(role) !== -1) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    });

    // If current view is now hidden, go to dashboard
    var activeBtn = document.querySelector('.sidebar-btn.active');
    if (activeBtn && activeBtn.classList.contains('hidden')) {
      showView('dashboard');
    }

    // Show/hide admin-only Add Player form
    var addPlayerCard = document.getElementById('add-player-form-card');
    if (addPlayerCard) {
      addPlayerCard.style.display = (role === 'admin') ? '' : 'none';
    }

    // Show/hide admin-only action buttons throughout the UI
    applyRoleUI(role);

    showToast('Role: ' + role.charAt(0).toUpperCase() + role.slice(1));
  };

  // Apply role-based UI restrictions to buttons
  function applyRoleUI(role) {
    // Elements with data-require-role attribute
    var restricted = document.querySelectorAll('[data-require-role]');
    restricted.forEach(function (el) {
      var required = el.getAttribute('data-require-role').split(' ');
      if (required.indexOf(role) !== -1) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  }

  // Init role
  switchRole('admin');

  // — POPULATE PLAYERS TABLE —
  var playersBody = document.getElementById('players-body');
  if (playersBody) {
    leagueTeams.forEach(function (team) {
      var row = document.createElement('tr');
      row.innerHTML =
        '<td>' + team.name + '</td>' +
        '<td>' + team.players[0].name + '</td>' +
        '<td>' + team.players[0].hcp + '</td>' +
        '<td>' + team.players[1].name + '</td>' +
        '<td>' + team.players[1].hcp + '</td>' +
        '<td><span class="status upcoming">Active</span></td>';
      playersBody.appendChild(row);
    });
  }

  // — POPULATE ADD-PLAYER TEAM SELECT —
  var addPlayerTeam = document.getElementById('add-player-team');
  if (addPlayerTeam) {
    leagueTeams.forEach(function (team) {
      var opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = team.name;
      addPlayerTeam.appendChild(opt);
    });
  }

  // — ADD PLAYER HANDLER (Admin Only) —
  window.addPlayer = function (e) {
    e.preventDefault();
    if (!requireRole(['admin'], 'Add Player')) return false;

    var name = document.getElementById('add-player-name').value.trim();
    var teamId = parseInt(document.getElementById('add-player-team').value, 10);
    var hcp = parseFloat(document.getElementById('add-player-hcp').value);
    var role = document.getElementById('add-player-role').value;

    if (!name || !teamId || isNaN(hcp) || !role) {
      showToast('Please fill in all fields');
      return false;
    }

    var team = null;
    for (var i = 0; i < leagueTeams.length; i++) {
      if (leagueTeams[i].id === teamId) { team = leagueTeams[i]; break; }
    }
    if (!team) { showToast('Team not found'); return false; }

    team.players.push({ name: name, hcp: hcp, role: role });

    var playersBody2 = document.getElementById('players-body');
    if (playersBody2) {
      var newRow = document.createElement('tr');
      newRow.innerHTML =
        '<td>' + team.name + '</td>' +
        '<td colspan="2">' + name + ' (HCP: ' + hcp + ')</td>' +
        '<td colspan="2">Role: ' + role.charAt(0).toUpperCase() + role.slice(1) + '</td>' +
        '<td><span class="status upcoming">Active</span></td>';
      playersBody2.appendChild(newRow);
    }

    var scorePlayer2 = document.getElementById('score-player');
    if (scorePlayer2) {
      var opt2 = document.createElement('option');
      opt2.value = name;
      opt2.textContent = name + ' (' + team.name + ', HCP: ' + hcp + ')';
      scorePlayer2.appendChild(opt2);
    }

    showToast('Player "' + name + '" added as ' + role.charAt(0).toUpperCase() + role.slice(1) + ' to ' + team.name);
    document.getElementById('add-player-form').reset();
    return false;
  };

  // — POPULATE SCORE PLAYER SELECT —
  var scorePlayer = document.getElementById('score-player');
  if (scorePlayer) {
    leagueTeams.forEach(function (team) {
      team.players.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name + ' (' + team.name + ', HCP: ' + p.hcp + ')';
        scorePlayer.appendChild(opt);
      });
    });
  }

  // — HOLE BY HOLE INPUTS —
  var holeInputs = document.getElementById('hole-by-hole-inputs');
  if (holeInputs) {
    for (var h = 1; h <= 9; h++) {
      var div = document.createElement('div');
      div.style.textAlign = 'center';
      div.innerHTML = '<label style="font-size:0.7rem;color:var(--gray-text);display:block;">H' + h + '</label>' +
        '<input type="number" class="form-control" style="padding:0.4rem 0.2rem;text-align:center;font-size:0.82rem;" placeholder="-">';
      holeInputs.appendChild(div);
    }
  }

  // — SUBMIT SCORE (Admin and Scorer) —
  window.submitScore = function () {
    if (!requireRole(['admin', 'scorer'], 'Enter Scores')) return;

    var player = document.getElementById('score-player').value;
    var course = document.getElementById('score-course').value;
    var side = document.getElementById('score-side').value;
    var date = document.getElementById('score-date').value;
    var total = document.getElementById('score-total').value;

    if (!player || !course || !date || !total) {
      showToast('Please fill in all required fields');
      return;
    }
    showToast('Score submitted for ' + player + ' — ' + total + ' (' + side + ' 9)');
  };

  // — SCHEDULE TABLE —
  var scheduleBody = document.getElementById('schedule-body');
  if (scheduleBody) {
    weeklySchedule.forEach(function (w) {
      var isRainout = rainouts.some(function (r) { return r.week === w.week; });
      var status = isRainout ? '<span class="status rainout">Rainout</span>' : '<span class="status upcoming">Upcoming</span>';
      var row = document.createElement('tr');
      row.innerHTML =
        '<td>Week ' + w.week + '</td>' +
        '<td>' + w.date + '</td>' +
        '<td>' + w.course + '</td>' +
        '<td>9-Hole Match Play</td>' +
        '<td>' + status + '</td>';
      scheduleBody.appendChild(row);
    });
  }

  // — PAYMENTS TABLE —
  var paymentsBody = document.getElementById('payments-body');
  if (paymentsBody) {
    leagueTeams.forEach(function (team, idx) {
      team.players.forEach(function (p, pi) {
        var paid = (idx * 2 + pi) < 32;
        var row = document.createElement('tr');
        row.innerHTML =
          '<td>' + team.name + '</td>' +
          '<td>' + p.name + '</td>' +
          '<td>$150</td>' +
          '<td><span class="status ' + (paid ? 'completed' : 'pending') + '">' + (paid ? 'Paid' : 'Pending') + '</span></td>' +
          '<td>' + (paid ? '<span style="color:var(--gray-text);font-size:0.8rem;">✓ Received</span>' :
            '<button class="btn-primary btn-sm" onclick="markPaid(this)">Mark Paid</button>') + '</td>';
        paymentsBody.appendChild(row);
      });
    });
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // — MARK PAID (Admin Only) —
  window.markPaid = function (btn) {
    if (!requireRole(['admin'], 'Mark Paid')) return;
    var td = btn.parentElement;
    var statusTd = td.previousElementSibling;
    statusTd.innerHTML = '<span class="status completed">Paid</span>';
    td.innerHTML = '<span style="color:var(--gray-text);font-size:0.8rem;">✓ Received</span>';
    showToast('Payment marked as received');
  };

  // — SCRAMBLE (Admin Only) —
  window.createScramble = function () {
    if (!requireRole(['admin'], 'Create Scramble')) return;
    var date = document.getElementById('scramble-date').value;
    var course = document.getElementById('scramble-course').value;
    if (!date) { showToast('Please select a date'); return; }
    showToast('Scramble event created at ' + course);
  };

  // — RAINOUT (Admin Only) —
  window.markRainout = function () {
    if (!requireRole(['admin'], 'Mark Rainout')) return;
    var weekNum = parseInt(document.getElementById('rainout-week').value);
    if (!weekNum) { showToast('Select a week first'); return; }
    var week = weeklySchedule[weekNum - 1];
    var reason = document.getElementById('rainout-reason').value;
    rainouts.push({ week: weekNum, date: week.date, reason: reason, rescheduled: 'TBD' });
    updateRainoutTable();
    showToast('Week ' + weekNum + ' marked as rainout');
  };

  window.rescheduleWeek = function () {
    if (!requireRole(['admin'], 'Reschedule Week')) return;
    var weekNum = parseInt(document.getElementById('rainout-week').value);
    var newDate = document.getElementById('rainout-reschedule').value;
    if (!weekNum || !newDate) { showToast('Select week and new date'); return; }
    var existing = rainouts.find(function (r) { return r.week === weekNum; });
    var formatted = new Date(newDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (existing) {
      existing.rescheduled = formatted;
    } else {
      var week = weeklySchedule[weekNum - 1];
      rainouts.push({
        week: weekNum, date: week.date,
        reason: document.getElementById('rainout-reason').value,
        rescheduled: formatted
      });
    }
    updateRainoutTable();
    showToast('Week ' + weekNum + ' rescheduled to ' + formatted);
  };

  function updateRainoutTable() {
    var body = document.getElementById('rainout-body');
    if (!body) return;
    if (rainouts.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gray-text);">No rainouts this season</td></tr>';
      return;
    }
    body.innerHTML = '';
    rainouts.forEach(function (r) {
      var row = document.createElement('tr');
      row.innerHTML =
        '<td>Week ' + r.week + '</td>' +
        '<td>' + r.date + '</td>' +
        '<td>' + r.reason + '</td>' +
        '<td>' + r.rescheduled + '</td>' +
        '<td><span class="status rainout">Rainout</span></td>';
      body.appendChild(row);
    });
  }

  // Populate rainout week select
  var rainoutWeekSel = document.getElementById('rainout-week');
  if (rainoutWeekSel) {
    weeklySchedule.forEach(function (w) {
      var opt = document.createElement('option');
      opt.value = w.week;
      opt.textContent = 'Week ' + w.week + ' — ' + w.date;
      rainoutWeekSel.appendChild(opt);
    });
  }

  // — LEAGUE CHAT —
  window.sendChat = function () {
    var input = document.getElementById('chat-input');
    var msg = input.value.trim();
    if (!msg) return;
    var messages = document.getElementById('chat-messages');
    var div = document.createElement('div');
    div.className = 'chat-message';
    var now = new Date();
    var timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
      now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    div.innerHTML =
      '<div class="chat-author">You (' + currentRole.charAt(0).toUpperCase() + currentRole.slice(1) + ')</div>' +
      '<div class="chat-text">' + escapeHtml(msg) + '</div>' +
      '<div class="chat-time">' + timeStr + '</div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    input.value = '';
  };

  // — HANDICAP FORMULA (Admin Only) —
  window.saveHandicapFormula = function () {
    if (!requireRole(['admin'], 'Save Handicap Formula')) return;
    var bestN = document.getElementById('hcp-best-n').value;
    var lastN = document.getElementById('hcp-last-n').value;
    var multiplier = document.getElementById('hcp-multiplier').value;
    document.getElementById('formula-best-n').textContent = bestN;
    document.getElementById('formula-last-n').textContent = lastN;
    document.getElementById('formula-multiplier').textContent = multiplier;
    showToast('Handicap formula saved');
  };

  // — PRINT ANALYTICS —
  window.printAnalytics = function () {
    if (!requireRole(['admin'], 'Print Analytics')) return;
    document.getElementById('analytics').classList.add('print-target');
    setTimeout(function () { window.print(); }, 200);
  };

  // — ADMIN TEAMS TABLE —
  var adminTeamsBody = document.getElementById('admin-teams-body');
  if (adminTeamsBody) {
    leagueTeams.forEach(function (team) {
      var combined = team.players[0].hcp + team.players[1].hcp;
      var row = document.createElement('tr');
      row.innerHTML =
        '<td>' + team.name + '</td>' +
        '<td>' + team.players[0].name + '</td>' +
        '<td>' + team.players[1].name + '</td>' +
        '<td>' + combined.toFixed(1) + '</td>' +
        '<td><span class="status upcoming">Active</span></td>';
      adminTeamsBody.appendChild(row);
    });
  }

  // — SCORECARD SYSTEM —
  var weekSelect = document.getElementById('sc-week');
  if (weekSelect) {
    var defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Select Week';
    weekSelect.appendChild(defaultOpt);

    weeklySchedule.forEach(function (w) {
      var opt = document.createElement('option');
      opt.value = w.week;
      opt.textContent = 'Week ' + w.week + ' — ' + w.date + ' (' + w.course + ')';
      weekSelect.appendChild(opt);
    });

    weekSelect.addEventListener('change', function () {
      var weekNum = parseInt(this.value);
      var container = document.getElementById('sc-matches-container');
      var frontDiv = document.getElementById('sc-front-matches');
      var backDiv = document.getElementById('sc-back-matches');
      var overrideSelect = document.getElementById('sc-override-match');

      if (!weekNum) { container.style.display = 'none'; return; }
      container.style.display = 'block';
      var week = weeklySchedule[weekNum - 1];

      var dateOverride = document.getElementById('sc-date-override');
      if (dateOverride && !dateOverride.value) {
        var d = new Date(week.date);
        if (!isNaN(d.getTime())) dateOverride.value = d.toISOString().split('T')[0];
      }

      frontDiv.innerHTML = '';
      week.front.forEach(function (pair, idx) {
        var tA = getTeamById(pair[0]);
        var tB = getTeamById(pair[1]);
        var div = document.createElement('div');
        div.className = 'match-chip';
        div.textContent = (idx + 1) + '. ' + tA.name + ' vs ' + tB.name;
        frontDiv.appendChild(div);
      });

      backDiv.innerHTML = '';
      week.back.forEach(function (pair, idx) {
        var tA = getTeamById(pair[0]);
        var tB = getTeamById(pair[1]);
        var div = document.createElement('div');
        div.className = 'match-chip';
        div.textContent = (idx + 1) + '. ' + tA.name + ' vs ' + tB.name;
        backDiv.appendChild(div);
      });

      // Populate override match select
      var fields = document.getElementById('sc-override-fields');
      var p1 = document.getElementById('sc-override-player1');
      var p2 = document.getElementById('sc-override-player2');
      p1.innerHTML = '<option value="">-- Keep default --</option>';
      p2.innerHTML = '<option value="">-- Keep default --</option>';
      leagueTeams.forEach(function (team) {
        team.players.forEach(function (player) {
          var opt1 = document.createElement('option');
          opt1.value = player.name + '|' + player.hcp;
          opt1.textContent = player.name + ' (' + player.hcp + ')';
          p1.appendChild(opt1);
          p2.appendChild(opt1.cloneNode(true));
        });
      });
      fields.style.display = 'block';
    });
  }

  // — APPLY OVERRIDE (Admin Only) —
  window.applyOverride = function () {
    if (!requireRole(['admin'], 'Apply Override')) return;
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
    if (p1Val) { var p = p1Val.split('|'); ov.player1 = { name: p[0], hcp: parseFloat(p[1]) }; }
    if (p2Val) { var p2 = p2Val.split('|'); ov.player2 = { name: p2[0], hcp: parseFloat(p2[1]) }; }
    if (hcp1) ov.hcp1A = parseFloat(hcp1);
    if (hcp2) ov.hcp2A = parseFloat(hcp2);
    if (sideOverride) ov.side = sideOverride;
    matchOverrides[overrideKey] = ov;
    showToast('Override applied for ' + side + ' match #' + (idx + 1));
  };

  function buildMatchPairings(teamAId, teamBId, side, matchIndex, weekNum) {
    var teamA = getTeamById(teamAId);
    var teamB = getTeamById(teamBId);
    if (!teamA || !teamB) return null;

    var overrideKey = weekNum + '-' + matchIndex + '-' + side;
    var override = matchOverrides[overrideKey] || {};

    var playersA = getSortedPlayers(teamA);
    var playersB = getSortedPlayers(teamB);

    var lowA = override.player1 || { name: playersA[0].name, hcp: playersA[0].hcp };
    var lowB = override.player1Opp || { name: playersB[0].name, hcp: playersB[0].hcp };
    var highA = override.player2 || { name: playersA[1].name, hcp: playersA[1].hcp };
    var highB = override.player2Opp || { name: playersB[1].name, hcp: playersB[1].hcp };

    if (override.hcp1A !== undefined) lowA.hcp = override.hcp1A;
    if (override.hcp1B !== undefined) lowB.hcp = override.hcp1B;
    if (override.hcp2A !== undefined) highA.hcp = override.hcp2A;
    if (override.hcp2B !== undefined) highB.hcp = override.hcp2B;

    return {
      teamA: teamA, teamB: teamB, side: override.side || side,
      lowMatch: { playerA: lowA, playerB: lowB },
      highMatch: { playerA: highA, playerB: highB }
    };
  }

  function getStrokeHoles(playerHcp, opponentHcp, holeHdcps) {
    var hcp9A = get9HoleHcp(playerHcp);
    var hcp9B = get9HoleHcp(opponentHcp);
    var diff = Math.round(hcp9A - hcp9B);
    var strokesReceived = diff > 0 ? diff : 0;
    var strokeHoles = [];
    if (strokesReceived > 0) {
      var ranked = holeHdcps.map(function (h, i) { return { idx: i, hdcp: h }; });
      ranked.sort(function (a, b) { return a.hdcp - b.hdcp; });
      for (var s = 0; s < Math.min(strokesReceived, 9); s++) {
        strokeHoles.push(ranked[s].idx);
      }
    }
    return strokeHoles;
  }

  function renderScorecard(match, side, courseInfo, matchDate, courseName) {
    var sideData = side === 'front' ? courseInfo.front : courseInfo.back;
    var sideLabel = side === 'front' ? 'Front Nine (Holes 1-9)' : 'Back Nine (Holes 10-18)';
    var totalPar = sideData.par.reduce(function (a, b) { return a + b; }, 0);

    function buildPlayerCard(playerA, playerB) {
      var hcp9A = get9HoleHcp(playerA.hcp);
      var hcp9B = get9HoleHcp(playerB.hcp);
      var strokeHolesA = getStrokeHoles(playerA.hcp, playerB.hcp, sideData.hdcp);
      var strokeHolesB = getStrokeHoles(playerB.hcp, playerA.hcp, sideData.hdcp);

      function playerRow(player, strokeHoles) {
        var cells = '';
        for (var i = 0; i < 9; i++) {
          var dot = strokeHoles.indexOf(i) !== -1 ? '<span class="stroke-dot">•</span>' : '';
          cells += '<td class="sc-score-cell">' + dot + '<span class="sc-score-blank"></span></td>';
        }
        return '<tr class="sc-player-row"><td class="sc-label sc-player-name">' + escapeHtml(player.name) + '</td>' + cells + '<td></td></tr>';
      }

      var holeNums = sideData.holes.map(function (h) { return '<th>' + h + '</th>'; }).join('');
      var parCells = sideData.par.map(function (p) { return '<td>' + p + '</td>'; }).join('');
      var hdcpCells = sideData.hdcp.map(function (h) { return '<td>' + h + '</td>'; }).join('');
      var yardCells = sideData.yards.map(function (y) { return '<td>' + y + '</td>'; }).join('');

      return '<table class="scorecard-table">' +
        '<thead>' +
        '<tr class="sc-hole-row"><th class="sc-label">Hole</th>' + holeNums + '<th>Tot</th></tr>' +
        '<tr class="sc-yards-row"><td class="sc-label">Yards</td>' + yardCells + '<td></td></tr>' +
        '<tr class="sc-par-row"><td class="sc-label">Par</td>' + parCells + '<td>' + totalPar + '</td></tr>' +
        '<tr class="sc-hdcp-row"><td class="sc-label">Hdcp</td>' + hdcpCells + '<td></td></tr>' +
        '</thead><tbody>' +
        playerRow(playerA, strokeHolesA) +
        playerRow(playerB, strokeHolesB) +
        '</tbody></table>';
    }

    var lowHtml = buildPlayerCard(match.lowMatch.playerA, match.lowMatch.playerB);
    var highHtml = buildPlayerCard(match.highMatch.playerA, match.highMatch.playerB);

    return '<div class="scorecard">' +
      '<div class="scorecard-header">' +
      '<div class="scorecard-date">' + matchDate + '</div>' +
      '<div class="scorecard-side">' + sideLabel + '</div>' +
      '<div class="scorecard-course">' + escapeHtml(courseName) + '</div>' +
      '<div class="scorecard-teams">' + escapeHtml(match.teamA.name) + ' vs ' + escapeHtml(match.teamB.name) + '</div>' +
      '</div>' +
      '<div class="scorecard-pair-label">Low HCP Match: ' + escapeHtml(match.lowMatch.playerA.name) + ' vs ' + escapeHtml(match.lowMatch.playerB.name) + '</div>' +
      lowHtml +
      '<div class="scorecard-pair-label">High HCP Match: ' + escapeHtml(match.highMatch.playerA.name) + ' vs ' + escapeHtml(match.highMatch.playerB.name) + '</div>' +
      highHtml +
      '</div>';
  }

  // — PREVIEW SCORECARDS (Admin Only) —
  window.previewScorecards = function () {
    if (!requireRole(['admin'], 'Preview Score Cards')) return;
    var weekNum = parseInt(document.getElementById('sc-week').value);
    if (!weekNum) { showToast('Select a week first'); return; }

    var week = weeklySchedule[weekNum - 1];
    var dateOverrideEl = document.getElementById('sc-date-override');
    var matchDate = dateOverrideEl && dateOverrideEl.value
      ? new Date(dateOverrideEl.value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : week.date;
    var courseInfo = courseData[week.course];
    var html = '';

    week.front.forEach(function (pair, idx) {
      var match = buildMatchPairings(pair[0], pair[1], 'front', idx, weekNum);
      if (match) html += '<div class="scorecard-pair">' + renderScorecard(match, 'front', courseInfo, matchDate, week.course) + '</div>';
    });
    week.back.forEach(function (pair, idx) {
      var match = buildMatchPairings(pair[0], pair[1], 'back', idx, weekNum);
      if (match) html += '<div class="scorecard-pair">' + renderScorecard(match, 'back', courseInfo, matchDate, week.course) + '</div>';
    });

    var preview = document.getElementById('sc-preview-area');
    preview.style.display = 'block';
    preview.innerHTML = html;
    showToast('Score cards generated for Week ' + weekNum);
  };

  // — PRINT SCORECARDS (Admin Only) —
  window.printScorecards = function () {
    if (!requireRole(['admin'], 'Print Score Cards')) return;
    var weekNum = parseInt(document.getElementById('sc-week').value);
    if (!weekNum) { showToast('Select a week first'); return; }

    var week = weeklySchedule[weekNum - 1];
    var dateOverrideEl = document.getElementById('sc-date-override');
    var matchDate = dateOverrideEl && dateOverrideEl.value
      ? new Date(dateOverrideEl.value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : week.date;
    var courseInfo = courseData[week.course];
    var html = '';

    week.front.forEach(function (pair, idx) {
      var match = buildMatchPairings(pair[0], pair[1], 'front', idx, weekNum);
      if (match) html += '<div class="scorecard-pair">' + renderScorecard(match, 'front', courseInfo, matchDate, week.course) + '</div>';
    });
    week.back.forEach(function (pair, idx) {
      var match = buildMatchPairings(pair[0], pair[1], 'back', idx, weekNum);
      if (match) html += '<div class="scorecard-pair">' + renderScorecard(match, 'back', courseInfo, matchDate, week.course) + '</div>';
    });

    var printStyles = [
      '.scorecard-pair { page-break-after: always; }',
      '.scorecard-pair-label { font-size:7pt; font-weight:700; color:#1A4A2E; margin:1rem 0 0.4rem; }',
      '.scorecard { border:1.5px solid #1A4A2E; border-radius:4px; margin-bottom:0; overflow:hidden; }',
      '.scorecard-header { background:#1A4A2E; color:#fff; padding:2px 6px; display:flex; flex-wrap:wrap; gap:0.25rem 0.5rem; align-items:center; }',
      '.scorecard-header > div { font-size:7pt; }',
      '.scorecard-date { font-weight:700; }',
      '.scorecard-side { background:#D4AF37; color:#1A4A2E; padding:1px 4px; border-radius:2px; font-weight:700; }',
      '.scorecard-course { font-style:italic; }',
      '.scorecard-teams { font-weight:600; }',
      '.scorecard-table { width:100%; border-collapse:collapse; }',
      '.scorecard-table th, .scorecard-table td { border:1px solid #999; padding:2px 3px; text-align:center; font-size:7.5pt; }',
      '.sc-label { text-align:left !important; font-weight:600; width:1in; min-width:0.9in; font-size:7pt; }',
      '.sc-player-name { color:#1A4A2E; }',
      '.sc-hole-row th { background:#1A4A2E; color:#fff; font-size:7.5pt; font-weight:600; }',
      '.sc-yards-row td { background:#f0f0f0; font-size:6.5pt; color:#666; }',
      '.sc-par-row td { background:#e8f5e9; font-weight:600; }',
      '.sc-hdcp-row td { background:#fff8e1; font-size:6.5pt; }',
      '.sc-player-row td { height:26px; position:relative; }',
      '.sc-score-cell { position:relative; }',
      '.stroke-dot { position:absolute; top:0; right:1px; color:#D4AF37; font-size:7pt; line-height:1; }',
      '.sc-score-blank { display:inline-block; width:18px; border-bottom:1px solid #ccc; }'
    ].join('\n');

    var printWin = window.open('', '_blank');
    printWin.document.write('<!DOCTYPE html><html><head><title>Fairway Command — Score Cards</title>');
    printWin.document.write('<style>' + printStyles + '</style></head><body>');
    printWin.document.write(html);
    printWin.document.write('</body></html>');
    printWin.document.close();
    printWin.onload = function () {
      printWin.focus();
      printWin.print();
      printWin.onafterprint = function () { printWin.close(); };
    };
  };

  // — PRINT ANALYTICS —
  window.printAnalytics = function () {
    if (!requireRole(['admin'], 'Print Analytics')) return;
    document.getElementById('analytics').classList.add('print-target');
    setTimeout(function () { window.print(); }, 200);
  };

  // Show dashboard by default
  showView('dashboard');
});
