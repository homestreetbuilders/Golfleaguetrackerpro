/* =====================================================
   GolfLeague TrackerPro — Dashboard Logic
   ===================================================== */

// ---- Sample Data ----
const players = [
  { name: "James Mitchell", handicap: 4, rounds: 12, avg: 74.2, best: 68, worst: 81, pts: 142 },
  { name: "Robert Chen", handicap: 6, rounds: 11, avg: 76.8, best: 70, worst: 84, pts: 134 },
  { name: "David O'Brien", handicap: 3, rounds: 12, avg: 73.5, best: 67, worst: 80, pts: 130 },
  { name: "Michael Torres", handicap: 8, rounds: 10, avg: 79.1, best: 72, worst: 88, pts: 126 },
  { name: "Sarah Johnson", handicap: 5, rounds: 12, avg: 75.9, best: 69, worst: 83, pts: 122 },
  { name: "Kevin Park", handicap: 10, rounds: 11, avg: 81.4, best: 74, worst: 92, pts: 118 },
  { name: "Emily Watson", handicap: 7, rounds: 10, avg: 78.3, best: 71, worst: 86, pts: 115 },
  { name: "Brian Foster", handicap: 12, rounds: 9, avg: 84.6, best: 76, worst: 95, pts: 110 },
  { name: "Lisa Chang", handicap: 9, rounds: 11, avg: 80.2, best: 73, worst: 89, pts: 107 },
  { name: "Thomas Reed", handicap: 11, rounds: 10, avg: 82.8, best: 75, worst: 91, pts: 102 },
  { name: "Nancy Kim", handicap: 6, rounds: 8, avg: 77.1, best: 70, worst: 85, pts: 98 },
  { name: "Andrew Scott", handicap: 14, rounds: 9, avg: 86.5, best: 78, worst: 97, pts: 94 },
];

const events = [
  { date: "2026-04-05", name: "Spring Scramble", course: "Pine Valley GC", type: "tournament" },
  { date: "2026-04-12", name: "League Week 5", course: "Augusta National", type: "league" },
  { date: "2026-04-19", name: "League Week 6", course: "Pebble Beach GL", type: "league" },
  { date: "2026-04-22", name: "Charity Classic", course: "Cypress Point", type: "social" },
  { date: "2026-04-26", name: "League Week 7", course: "Shinnecock Hills", type: "league" },
  { date: "2026-05-03", name: "May Day Invitational", course: "Pine Valley GC", type: "tournament" },
];

const recentScores = [
  { player: "James Mitchell", score: 72, course: "Pine Valley GC", date: "Mar 26" },
  { player: "David O'Brien", score: 69, course: "Augusta National", date: "Mar 26" },
  { player: "Sarah Johnson", score: 74, course: "Pine Valley GC", date: "Mar 25" },
  { player: "Robert Chen", score: 77, course: "Pebble Beach GL", date: "Mar 25" },
  { player: "Emily Watson", score: 76, course: "Augusta National", date: "Mar 24" },
  { player: "Kevin Park", score: 80, course: "Cypress Point", date: "Mar 24" },
];

const coursePerf = [
  { name: "Pine Valley", avg: 78.2 },
  { name: "Augusta", avg: 81.5 },
  { name: "Pebble Beach", avg: 80.1 },
  { name: "Cypress Pt", avg: 83.7 },
  { name: "Shinnecock", avg: 82.4 },
];

const schedule = [
  { date: "Mar 8, 2026", title: "League Week 1", course: "Pine Valley GC", status: "completed" },
  { date: "Mar 15, 2026", title: "League Week 2", course: "Augusta National", status: "completed" },
  { date: "Mar 22, 2026", title: "League Week 3", course: "Pebble Beach GL", status: "completed" },
  { date: "Mar 29, 2026", title: "League Week 4", course: "Cypress Point", status: "in-progress" },
  { date: "Apr 5, 2026", title: "Spring Scramble", course: "Pine Valley GC", status: "upcoming" },
  { date: "Apr 12, 2026", title: "League Week 5", course: "Augusta National", status: "upcoming" },
  { date: "Apr 19, 2026", title: "League Week 6", course: "Pebble Beach GL", status: "upcoming" },
  { date: "Apr 22, 2026", title: "Charity Classic", course: "Cypress Point", status: "upcoming" },
  { date: "Apr 26, 2026", title: "League Week 7", course: "Shinnecock Hills", status: "upcoming" },
  { date: "May 3, 2026", title: "May Day Invitational", course: "Pine Valley GC", status: "upcoming" },
];

const scoreHistory = [
  { date: "2026-03-26", player: "James Mitchell", course: "Pine Valley GC", score: 72, par: 72 },
  { date: "2026-03-26", player: "David O'Brien", course: "Augusta National", score: 69, par: 72 },
  { date: "2026-03-25", player: "Sarah Johnson", course: "Pine Valley GC", score: 74, par: 72 },
  { date: "2026-03-25", player: "Robert Chen", course: "Pebble Beach GL", score: 77, par: 72 },
  { date: "2026-03-24", player: "Emily Watson", course: "Augusta National", score: 76, par: 72 },
  { date: "2026-03-24", player: "Kevin Park", course: "Cypress Point", score: 80, par: 72 },
  { date: "2026-03-23", player: "Michael Torres", course: "Shinnecock Hills", score: 79, par: 72 },
  { date: "2026-03-22", player: "Lisa Chang", course: "Pebble Beach GL", score: 78, par: 72 },
  { date: "2026-03-22", player: "Brian Foster", course: "Pine Valley GC", score: 84, par: 72 },
  { date: "2026-03-21", player: "Thomas Reed", course: "Augusta National", score: 82, par: 72 },
];

// ---- Helpers ----
function initials(name) {
  return name.split(" ").map(w => w[0]).join("");
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function monthAbbr(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

function dayNum(dateStr) {
  return new Date(dateStr + "T00:00:00").getDate();
}

// ---- Render Dashboard ----
function renderLeaderboard() {
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = players.slice(0, 10).map((p, i) => {
    const rankClass = i < 3 ? ` rank-${i + 1}` : "";
    return `<tr>
      <td class="rank-cell${rankClass}">${i + 1}</td>
      <td><div class="player-cell"><span class="player-avatar-sm">${initials(p.name)}</span>${p.name}</div></td>
      <td>${p.rounds}</td>
      <td>${p.avg}</td>
      <td>${p.best}</td>
      <td><strong>${p.pts}</strong></td>
    </tr>`;
  }).join("");
}

function renderFullLeaderboard() {
  const tbody = document.getElementById("fullLeaderboard");
  tbody.innerHTML = players.map((p, i) => {
    const rankClass = i < 3 ? ` rank-${i + 1}` : "";
    return `<tr>
      <td class="rank-cell${rankClass}">${i + 1}</td>
      <td><div class="player-cell"><span class="player-avatar-sm">${initials(p.name)}</span>${p.name}</div></td>
      <td>${p.handicap}</td>
      <td>${p.rounds}</td>
      <td>${p.avg}</td>
      <td>${p.best}</td>
      <td>${p.worst}</td>
      <td><strong>${p.pts}</strong></td>
    </tr>`;
  }).join("");
}

function renderEvents() {
  const ul = document.getElementById("eventList");
  ul.innerHTML = events.map(e => {
    const typeClass = `type-${e.type}`;
    const typeLabel = e.type.charAt(0).toUpperCase() + e.type.slice(1);
    return `<li class="event-item">
      <div class="event-date-box">
        <span class="event-month">${monthAbbr(e.date)}</span>
        <span class="event-day">${dayNum(e.date)}</span>
      </div>
      <div class="event-info">
        <div class="event-name">${e.name}</div>
        <div class="event-course">${e.course}</div>
      </div>
      <span class="event-type ${typeClass}">${typeLabel}</span>
    </li>`;
  }).join("");
}

function renderRecentScores() {
  const ul = document.getElementById("recentScores");
  ul.innerHTML = recentScores.map(s => `
    <li class="score-item">
      <span class="player-avatar-sm">${initials(s.player)}</span>
      <span class="score-player">${s.player}</span>
      <span class="score-course-sm">${s.course}</span>
      <span class="score-val">${s.score}</span>
    </li>
  `).join("");
}

function renderBarChart() {
  const container = document.getElementById("courseChart");
  const max = Math.max(...coursePerf.map(c => c.avg));
  const min = Math.min(...coursePerf.map(c => c.avg));
  const range = max - min || 1;
  container.innerHTML = coursePerf.map(c => {
    const pct = 30 + ((c.avg - min) / range) * 60;
    return `<div class="bar-group">
      <div class="bar" style="height:${pct}%"><span class="bar-value">${c.avg}</span></div>
      <span class="bar-label">${c.name}</span>
    </div>`;
  }).join("");
}

function renderSchedule() {
  const grid = document.getElementById("scheduleGrid");
  grid.innerHTML = schedule.map(s => {
    const statusClass = `status-${s.status}`;
    const statusLabel = s.status === "in-progress" ? "In Progress" : s.status.charAt(0).toUpperCase() + s.status.slice(1);
    return `<div class="schedule-item">
      <div class="schedule-date">${s.date}</div>
      <div class="schedule-title">${s.title}</div>
      <div class="schedule-course">${s.course}</div>
      <span class="schedule-status ${statusClass}">${statusLabel}</span>
    </div>`;
  }).join("");
}

function renderPlayers() {
  const grid = document.getElementById("playersGrid");
  grid.innerHTML = players.map(p => `
    <div class="player-card">
      <div class="player-avatar-lg">${initials(p.name)}</div>
      <div class="player-name">${p.name}</div>
      <div class="player-handicap">HCP ${p.handicap}</div>
      <div class="player-stats-row">
        <div class="player-stat-item"><span class="player-stat-val">${p.rounds}</span>Rounds</div>
        <div class="player-stat-item"><span class="player-stat-val">${p.avg}</span>Avg</div>
        <div class="player-stat-item"><span class="player-stat-val">${p.best}</span>Best</div>
      </div>
    </div>
  `).join("");
}

function renderScorePlayerSelect() {
  const sel = document.getElementById("scorePlayer");
  sel.innerHTML = players.map(p => `<option>${p.name}</option>`).join("");
}

function renderScoreHistory() {
  const tbody = document.getElementById("scoreHistory");
  tbody.innerHTML = scoreHistory.map(s => {
    const diff = s.score - s.par;
    const diffStr = diff === 0 ? "E" : (diff > 0 ? `+${diff}` : `${diff}`);
    const diffColor = diff < 0 ? "color:var(--green-600)" : diff > 0 ? "color:var(--red)" : "";
    return `<tr>
      <td>${formatDate(s.date)}</td>
      <td>${s.player}</td>
      <td>${s.course}</td>
      <td><strong>${s.score}</strong></td>
      <td style="${diffColor};font-weight:700">${diffStr}</td>
    </tr>`;
  }).join("");
}

// ---- Navigation ----
function switchSection(sectionId) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const section = document.getElementById("section-" + sectionId);
  if (section) section.classList.add("active");
  const nav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (nav) nav.classList.add("active");
  const navTitleMap = {
    dashboard: "Dashboard",
    "season-overview": "Season Overview",
    leaderboard: "Leaderboard",
    schedule: "Season Schedule",
    players: "Players",
    scores: "Scores",
    analytics: "Analytics",
    payments: "Payments",
    courses: "Courses",
    "league-chat": "League Chat",
    instructions: "Instructions",
    settings: "Settings",
    admin: "Admin — Score Cards",
  };
  document.querySelector(".page-title").textContent = navTitleMap[sectionId] || "Dashboard";
  // Close mobile sidebar
  document.getElementById("sidebar").classList.remove("open");
}

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    switchSection(item.dataset.section);
  });
});

// Mobile menu toggle
document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// Score form handler
document.getElementById("scoreForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const player = document.getElementById("scorePlayer").value;
  const course = document.getElementById("scoreCourse").value;
  const date = document.getElementById("scoreDate").value;
  const score = parseInt(document.getElementById("scoreValue").value, 10);
  if (!date || !score) return;
  scoreHistory.unshift({ date, player, course, score, par: 72 });
  renderScoreHistory();
  document.getElementById("scoreForm").reset();
});

// ---- Teams & Match Data for Scorecard Printing ----

const teams = [
  { id: 1,  players: [{ name: "James Mitchell",  handicap: 4 },  { name: "Brian Foster",    handicap: 12 }] },
  { id: 2,  players: [{ name: "Robert Chen",      handicap: 6 },  { name: "Thomas Reed",     handicap: 11 }] },
  { id: 3,  players: [{ name: "David O'Brien",    handicap: 3 },  { name: "Andrew Scott",    handicap: 14 }] },
  { id: 4,  players: [{ name: "Michael Torres",   handicap: 8 },  { name: "Lisa Chang",      handicap: 9 }] },
  { id: 5,  players: [{ name: "Sarah Johnson",    handicap: 5 },  { name: "Kevin Park",      handicap: 10 }] },
  { id: 6,  players: [{ name: "Emily Watson",     handicap: 7 },  { name: "Nancy Kim",       handicap: 6 }] },
  { id: 7,  players: [{ name: "Chris Adams",      handicap: 2 },  { name: "Mark Davis",      handicap: 15 }] },
  { id: 8,  players: [{ name: "Paul Martinez",    handicap: 9 },  { name: "Steve Wilson",    handicap: 13 }] },
  { id: 9,  players: [{ name: "Dan Thompson",     handicap: 5 },  { name: "Greg Harris",     handicap: 11 }] },
  { id: 10, players: [{ name: "Tony Clark",       handicap: 7 },  { name: "Jeff Robinson",   handicap: 16 }] },
  { id: 11, players: [{ name: "Matt Lewis",       handicap: 4 },  { name: "Ryan Walker",     handicap: 10 }] },
  { id: 12, players: [{ name: "Ben Hall",         handicap: 8 },  { name: "Nick Young",      handicap: 12 }] },
  { id: 13, players: [{ name: "Sam King",         handicap: 3 },  { name: "Jake Wright",     handicap: 14 }] },
  { id: 14, players: [{ name: "Alex Turner",      handicap: 6 },  { name: "Luke Green",      handicap: 9 }] },
  { id: 15, players: [{ name: "Will Baker",       handicap: 10 }, { name: "Joe Campbell",    handicap: 17 }] },
  { id: 16, players: [{ name: "Peter Morgan",     handicap: 5 },  { name: "Jason Lee",       handicap: 11 }] },
  { id: 17, players: [{ name: "Carl Nelson",      handicap: 8 },  { name: "Doug Phillips",   handicap: 13 }] },
  { id: 18, players: [{ name: "Ray Evans",        handicap: 6 },  { name: "Tom Collins",     handicap: 15 }] },
  { id: 19, players: [{ name: "Bill Murphy",      handicap: 4 },  { name: "Ed Brooks",       handicap: 10 }] },
  { id: 20, players: [{ name: "Frank Howard",     handicap: 7 },  { name: "George Price",    handicap: 12 }] },
];

const courseData = {
  "Pine Valley GC": {
    front: { holes: [1,2,3,4,5,6,7,8,9], par: [4,3,5,4,4,3,4,5,4], hdcp: [7,15,1,3,11,17,5,9,13], yards: [385,165,520,410,375,155,400,530,360] },
    back:  { holes: [10,11,12,13,14,15,16,17,18], par: [4,5,3,4,4,5,3,4,4], hdcp: [8,2,16,6,10,4,18,12,14], yards: [400,545,170,420,380,510,150,395,370] }
  },
  "Augusta National": {
    front: { holes: [1,2,3,4,5,6,7,8,9], par: [4,5,4,3,4,3,4,5,4], hdcp: [5,1,9,13,3,17,7,11,15], yards: [445,575,350,240,455,180,450,570,460] },
    back:  { holes: [10,11,12,13,14,15,16,17,18], par: [4,4,3,5,4,5,3,4,4], hdcp: [6,4,14,2,8,10,16,12,18], yards: [495,520,155,510,440,530,170,440,465] }
  },
  "Pebble Beach GL": {
    front: { holes: [1,2,3,4,5,6,7,8,9], par: [4,5,4,4,3,5,3,4,4], hdcp: [9,3,7,1,15,5,17,11,13], yards: [380,502,390,405,170,515,110,418,466] },
    back:  { holes: [10,11,12,13,14,15,16,17,18], par: [4,4,3,4,5,4,4,3,5], hdcp: [10,4,18,2,6,14,8,16,12], yards: [426,390,202,445,580,397,403,178,543] }
  },
  "Cypress Point": {
    front: { holes: [1,2,3,4,5,6,7,8,9], par: [4,4,3,4,5,4,3,4,5], hdcp: [11,3,15,5,1,7,17,9,13], yards: [420,390,160,385,500,435,165,410,545] },
    back:  { holes: [10,11,12,13,14,15,16,17,18], par: [5,4,3,4,4,3,4,5,4], hdcp: [2,8,14,6,12,18,4,10,16], yards: [560,440,135,410,365,145,430,520,380] }
  },
  "Shinnecock Hills": {
    front: { holes: [1,2,3,4,5,6,7,8,9], par: [4,3,4,4,5,4,3,4,5], hdcp: [3,13,1,9,7,5,15,11,17], yards: [395,225,455,425,535,470,190,370,555] },
    back:  { holes: [10,11,12,13,14,15,16,17,18], par: [4,3,4,4,5,4,3,5,4], hdcp: [4,16,2,10,6,8,18,14,12], yards: [410,158,472,395,535,420,175,540,450] }
  }
};

const weeklySchedule = [
  { week: 1, date: "Apr 5, 2026",  course: "Pine Valley GC",   front: [[1,2],[3,4],[5,6],[7,8],[9,10]],     back: [[11,12],[13,14],[15,16],[17,18],[19,20]] },
  { week: 2, date: "Apr 12, 2026", course: "Augusta National",  front: [[1,3],[2,5],[4,7],[6,9],[8,11]],     back: [[10,13],[12,15],[14,17],[16,19],[18,20]] },
  { week: 3, date: "Apr 19, 2026", course: "Pebble Beach GL",   front: [[1,4],[2,6],[3,8],[5,10],[7,12]],    back: [[9,14],[11,16],[13,18],[15,20],[17,19]] },
  { week: 4, date: "Apr 26, 2026", course: "Cypress Point",     front: [[1,5],[2,7],[3,9],[4,11],[6,13]],    back: [[8,15],[10,17],[12,19],[14,20],[16,18]] },
  { week: 5, date: "May 3, 2026",  course: "Shinnecock Hills",  front: [[1,6],[2,8],[3,10],[4,12],[5,14]],   back: [[7,16],[9,18],[11,20],[13,19],[15,17]] },
  { week: 6, date: "May 10, 2026", course: "Pine Valley GC",    front: [[1,7],[2,9],[3,11],[4,13],[5,15]],   back: [[6,17],[8,19],[10,20],[12,18],[14,16]] },
  { week: 7, date: "May 17, 2026", course: "Augusta National",  front: [[1,8],[2,10],[3,12],[4,14],[5,16]],  back: [[6,18],[7,20],[9,19],[11,17],[13,15]] },
  { week: 8, date: "May 24, 2026", course: "Pebble Beach GL",   front: [[1,9],[2,11],[3,13],[4,15],[5,17]],  back: [[6,19],[7,18],[8,20],[10,16],[12,14]] },
  { week: 9, date: "May 31, 2026", course: "Cypress Point",     front: [[1,10],[2,12],[3,14],[4,16],[5,18]], back: [[6,20],[7,19],[8,17],[9,15],[11,13]] },
  { week: 10, date: "Jun 7, 2026", course: "Shinnecock Hills",  front: [[1,11],[2,13],[3,15],[4,17],[5,19]], back: [[6,16],[7,14],[8,12],[9,20],[10,18]] },
];

// ---- Scorecard Logic ----

function get9HoleHcp(hcp18) {
  return Math.round((hcp18 / 2) * 10) / 10;
}

function getStrokeHoles(playerHcp9, opponentHcp9, holeHdcps) {
  // Calculate how many strokes this player receives
  const diff = Math.round(playerHcp9 - opponentHcp9);
  if (diff <= 0) return [];
  // Sort holes by handicap ranking (1 = hardest first)
  const sortedHoles = holeHdcps
    .map((hdcp, i) => ({ index: i, hdcp }))
    .sort((a, b) => a.hdcp - b.hdcp);
  // Player receives strokes on the N hardest holes
  return sortedHoles.slice(0, diff).map(h => h.index);
}

function buildScorecardHTML(playerA, playerB, side, courseInfo, matchNum, courseName, matchDate) {
  const sideData = side === "front" ? courseInfo.front : courseInfo.back;
  const sideLabel = side === "front" ? "Front 9" : "Back 9";

  const hcpA9 = get9HoleHcp(playerA.handicap);
  const hcpB9 = get9HoleHcp(playerB.handicap);

  const strokeHolesA = getStrokeHoles(hcpA9, hcpB9, sideData.hdcp);
  const strokeHolesB = getStrokeHoles(hcpB9, hcpA9, sideData.hdcp);

  const totalPar = sideData.par.reduce((s, v) => s + v, 0);

  let html = `<div class="scorecard">
    <div class="scorecard-header">
      <div class="scorecard-title">
        <span class="scorecard-course">${courseName}</span>
        <span class="scorecard-date">${matchDate}</span>
      </div>
      <div class="scorecard-match-info">
        <span class="scorecard-side-badge">${sideLabel}</span>
        <span class="scorecard-match-num">Match ${matchNum}</span>
      </div>
    </div>
    <table class="scorecard-table">
      <thead>
        <tr class="hole-row">
          <th class="label-cell">Hole</th>`;
  sideData.holes.forEach(h => { html += `<th class="hole-cell">${h}</th>`; });
  html += `<th class="total-cell">Total</th></tr>
      </thead>
      <tbody>
        <tr class="yards-row">
          <td class="label-cell">Yards</td>`;
  sideData.yards.forEach(y => { html += `<td class="data-cell">${y}</td>`; });
  html += `<td class="data-cell">${sideData.yards.reduce((s,v)=>s+v,0)}</td></tr>
        <tr class="par-row">
          <td class="label-cell">Par</td>`;
  sideData.par.forEach(p => { html += `<td class="data-cell">${p}</td>`; });
  html += `<td class="data-cell">${totalPar}</td></tr>
        <tr class="hdcp-row">
          <td class="label-cell">Hdcp</td>`;
  sideData.hdcp.forEach(h => { html += `<td class="data-cell">${h}</td>`; });
  html += `<td class="data-cell"></td></tr>`;

  // Player A row
  html += `<tr class="player-row player-a-row">
    <td class="label-cell player-label">${playerA.name}<span class="player-hcp">(${playerA.handicap})</span></td>`;
  for (let i = 0; i < 9; i++) {
    const hasDot = strokeHolesA.includes(i);
    html += `<td class="score-cell">${hasDot ? '<span class="stroke-dot"></span>' : ''}</td>`;
  }
  html += `<td class="score-cell total-score"></td></tr>`;

  // Player B row
  html += `<tr class="player-row player-b-row">
    <td class="label-cell player-label">${playerB.name}<span class="player-hcp">(${playerB.handicap})</span></td>`;
  for (let i = 0; i < 9; i++) {
    const hasDot = strokeHolesB.includes(i);
    html += `<td class="score-cell">${hasDot ? '<span class="stroke-dot"></span>' : ''}</td>`;
  }
  html += `<td class="score-cell total-score"></td></tr>`;

  html += `</tbody></table></div>`;
  return html;
}

function generateWeekScorecards(weekNum) {
  const week = weeklySchedule.find(w => w.week === weekNum);
  if (!week) return "<p>Week not found.</p>";

  const course = courseData[week.course];
  if (!course) return "<p>Course data not found.</p>";

  let html = "";
  let matchCounter = 1;

  // Front 9 matches
  week.front.forEach(([teamAId, teamBId]) => {
    const teamA = teams.find(t => t.id === teamAId);
    const teamB = teams.find(t => t.id === teamBId);
    if (!teamA || !teamB) return;

    // Low handicap match
    const lowA = teamA.players[0];
    const lowB = teamB.players[0];
    // High handicap match
    const highA = teamA.players[1];
    const highB = teamB.players[1];

    html += `<div class="scorecard-pair">
      <div class="pair-header">Team ${teamAId} vs Team ${teamBId} — Front 9</div>`;
    html += buildScorecardHTML(lowA, lowB, "front", course, matchCounter, week.course, week.date);
    matchCounter++;
    html += buildScorecardHTML(highA, highB, "front", course, matchCounter, week.course, week.date);
    matchCounter++;
    html += `</div>`;
  });

  // Back 9 matches
  week.back.forEach(([teamAId, teamBId]) => {
    const teamA = teams.find(t => t.id === teamAId);
    const teamB = teams.find(t => t.id === teamBId);
    if (!teamA || !teamB) return;

    const lowA = teamA.players[0];
    const lowB = teamB.players[0];
    const highA = teamA.players[1];
    const highB = teamB.players[1];

    html += `<div class="scorecard-pair">
      <div class="pair-header">Team ${teamAId} vs Team ${teamBId} — Back 9</div>`;
    html += buildScorecardHTML(lowA, lowB, "back", course, matchCounter, week.course, week.date);
    matchCounter++;
    html += buildScorecardHTML(highA, highB, "back", course, matchCounter, week.course, week.date);
    matchCounter++;
    html += `</div>`;
  });

  return html;
}

function renderAdminWeekSelect() {
  const sel = document.getElementById("adminWeekSelect");
  if (!sel) return;
  sel.innerHTML = weeklySchedule.map(w =>
    `<option value="${w.week}">Week ${w.week} — ${w.date} — ${w.course}</option>`
  ).join("");
}

function previewScorecards() {
  const weekNum = parseInt(document.getElementById("adminWeekSelect").value, 10);
  document.getElementById("scorecardsPreview").innerHTML = generateWeekScorecards(weekNum);
}

function printScorecards() {
  const weekNum = parseInt(document.getElementById("adminWeekSelect").value, 10);
  const content = generateWeekScorecards(weekNum);

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Scorecards — Week ${weekNum}</title>
<style>
  @page { size: 7in 5in; margin: 0.375in; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10px; color: #1e1e1e; }
  .scorecard-pair { page-break-after: always; }
  .scorecard-pair:last-child { page-break-after: auto; }
  .pair-header { font-size: 11px; font-weight: 700; color: #1a3a2a; margin-bottom: 8px; text-align: center; }
  .scorecard { margin-bottom: 16px; border: 1.5px solid #1a3a2a; border-radius: 6px; overflow: hidden; }
  .scorecard-header { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #1a3a2a, #2e7d32); color: #fff; padding: 6px 10px; }
  .scorecard-course { font-weight: 700; font-size: 11px; }
  .scorecard-date { font-size: 9px; opacity: .85; }
  .scorecard-title { display: flex; flex-direction: column; gap: 1px; }
  .scorecard-match-info { display: flex; align-items: center; gap: 6px; }
  .scorecard-side-badge { background: #c5a028; color: #1a3a2a; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; }
  .scorecard-match-num { font-size: 9px; opacity: .85; }
  .scorecard-table { width: 100%; border-collapse: collapse; }
  .scorecard-table th, .scorecard-table td { border: 1px solid #ccc; text-align: center; padding: 3px 2px; font-size: 9px; }
  .label-cell { text-align: left; padding-left: 6px; width: 120px; font-weight: 600; font-size: 8.5px; }
  .hole-row th { background: #1a3a2a; color: #fff; font-size: 9px; font-weight: 700; }
  .hole-row .label-cell { background: #1a3a2a; color: #fff; }
  .hole-row .total-cell { background: #1a3a2a; color: #fff; font-size: 9px; }
  .yards-row td { background: #f5f5f5; font-size: 8px; color: #555; }
  .par-row td { background: #e8f5e9; font-weight: 700; color: #1a3a2a; }
  .hdcp-row td { background: #fff8e1; font-size: 8px; color: #8d6e00; }
  .player-row td { height: 26px; }
  .player-a-row td { background: #f0f8ff; }
  .player-b-row td { background: #fff5f5; }
  .player-label { font-size: 8px; line-height: 1.2; }
  .player-hcp { display: block; font-size: 7px; color: #888; font-weight: 400; }
  .score-cell { position: relative; min-width: 28px; }
  .total-cell, .total-score { font-weight: 700; }
  .stroke-dot { position: absolute; top: 2px; right: 3px; width: 7px; height: 7px; background: #8B0000; border-radius: 50%; display: block; }
  @media print {
    .scorecard-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hole-row th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .yards-row td, .par-row td, .hdcp-row td, .player-a-row td, .player-b-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .stroke-dot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .scorecard-side-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>${content}</body></html>`);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 400);
}

// Admin event listeners
document.getElementById("previewScorecardsBtn")?.addEventListener("click", previewScorecards);
document.getElementById("printScorecardsBtn")?.addEventListener("click", printScorecards);

// ---- Payments Data & Rendering ----
const paymentData = players.map((p, i) => ({
  player: p.name,
  team: i < 2 ? "Eagles" : i < 4 ? "Birdies" : i < 6 ? "Fairways" : i < 8 ? "Drivers" : i < 10 ? "Putters" : "Wedges",
  fee: "$150",
  paid: i % 3 !== 1
}));

function renderPayments() {
  const tbody = document.getElementById("paymentBody");
  if (!tbody) return;
  tbody.innerHTML = paymentData.map(p => {
    const statusClass = p.paid ? "status-completed" : "status-upcoming";
    const statusLabel = p.paid ? "Paid" : "Pending";
    return `<tr>
      <td>${p.player}</td>
      <td>${p.team}</td>
      <td>${p.fee}</td>
      <td><span class="schedule-status ${statusClass}">${statusLabel}</span></td>
    </tr>`;
  }).join("");
}

// ---- Chat Send ----
document.getElementById("chatSendBtn")?.addEventListener("click", () => {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;
  const container = document.getElementById("chatMessages");
  const now = new Date();
  const timeStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const div = document.createElement("div");
  div.className = "chat-message";
  div.innerHTML = `<span class="player-avatar-sm chat-avatar">A</span>
    <div class="chat-bubble">
      <div class="chat-author">Admin</div>
      <div class="chat-text">${msg.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      <div class="chat-time">${timeStr}</div>
    </div>`;
  container.prepend(div);
  input.value = "";
});

document.getElementById("chatInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("chatSendBtn").click();
});

// ---- Init ----
function init() {
  renderLeaderboard();
  renderFullLeaderboard();
  renderEvents();
  renderRecentScores();
  renderBarChart();
  renderSchedule();
  renderPlayers();
  renderScorePlayerSelect();
  renderScoreHistory();
  renderAdminWeekSelect();
  renderPayments();
  document.getElementById("scoreDate").value = new Date().toISOString().split("T")[0];
}

init();
