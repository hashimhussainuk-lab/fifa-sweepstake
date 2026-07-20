
const TEAMS_BY_PERSON = {
  "Adam": [
    "Morocco",
    "Mexico",
    "Croatia",
    "Netherlands",
    "Czech Republic",
    "Bosnia and Herzegovina"
  ],
  "Zach": [
    "Spain",
    "Norway",
    "Senegal",
    "Japan",
    "Saudi Arabia",
    "Turkey"
  ],
  "Joe D": [
    "England",
    "Austria",
    "Cape Verde Islands",
    "Sweden",
    "Switzerland",
    "Iran"
  ],
  "Laura": [
    "Paraguay",
    "Scotland",
    "Egypt",
    "Belgium",
    "Portugal",
    "Ecuador"
  ],
  "Joe S": [
    "Curaçao",
    "Côte d'Ivoire",
    "Congo DR",
    "United States",
    "Uzbekistan",
    "Canada"
  ],
  "Faizan": [
    "Australia",
    "Haiti",
    "Ghana",
    "Panama",
    "Tunisia",
    "Argentina"
  ],
  "Hashim": [
    "Jordan",
    "New Zealand",
    "Uruguay",
    "South Africa",
    "Iraq",
    "Qatar"
  ],
  "Yen": [
    "Colombia",
    "Germany",
    "Algeria",
    "Brazil",
    "Korea Republic",
    "France"
  ]
};
const PRIZES = [
  {
    "name": "Champion / Tournament Winner",
    "amount": 100,
    "criteria": "The person who has the team that wins the tournament."
  },
  {
    "name": "Runner-Up",
    "amount": 40,
    "criteria": "The person who has the team that finishes second."
  },
  {
    "name": "Most Goals Conceded",
    "amount": 25,
    "criteria": "Combined total goals conceded by all of a participant’s teams across the whole tournament."
  },
  {
    "name": "Most Cards",
    "amount": 25,
    "criteria": "Combined total yellow + red cards received by all of a participant’s teams across the whole tournament."
  },
  {
    "name": "Quickest Goal",
    "amount": 25,
    "criteria": "The person who owns the team that scores the quickest goal in the tournament."
  },
  {
    "name": "Biggest Goal Difference Match",
    "amount": 25,
    "criteria": "Single match with the biggest winning margin. The two owners of the teams involved split the prize."
  }
];

const STORAGE_KEY = "hostuplift_fifa_sweepstake_v1";

const allTeams = Object.entries(TEAMS_BY_PERSON).flatMap(([person, teams]) =>
  teams.map(team => ({ team, person }))
);

const TEAM_ALIASES = {
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Czechia": "Czech Republic",
  "Ivory Coast": "Côte d'Ivoire",
  "South Korea": "Korea Republic"
};

// Final tournament discipline totals: yellow cards + red cards.
// Stored as the completed-tournament record for the final recap.
const FINAL_TEAM_CARDS = {
  "Argentina": 14, "Egypt": 12, "Canada": 11, "Paraguay": 10,
  "Ecuador": 9, "England": 9, "Bosnia and Herzegovina": 8, "United States": 8,
  "Brazil": 8, "Colombia": 8, "Belgium": 7, "Switzerland": 7,
  "Curaçao": 7, "Haiti": 7, "Morocco": 7, "Portugal": 7,
  "South Africa": 7, "Congo DR": 6, "France": 6, "Ghana": 6,
  "Iran": 6, "Saudi Arabia": 6, "Spain": 6, "Uruguay": 6,
  "Qatar": 6, "Iraq": 5, "Mexico": 5, "Australia": 5,
  "Austria": 5, "Cape Verde Islands": 5, "Panama": 5, "Scotland": 5,
  "Sweden": 5, "Croatia": 4, "Côte d'Ivoire": 4, "Japan": 4,
  "Jordan": 4, "New Zealand": 4, "Korea Republic": 4, "Uzbekistan": 4,
  "Algeria": 3, "Germany": 3, "Netherlands": 3, "Norway": 3,
  "Senegal": 3, "Turkey": 2, "Czech Republic": 1, "Tunisia": 1
};

const FINAL_QUICKEST_GOAL = {
  team: "Paraguay",
  minute: 64 / 60,
  display: "64 seconds",
  opponent: "Turkey"
};

const ownerByTeam = Object.fromEntries(allTeams.map(x => [x.team, x.person]));

function canonicalTeam(team) {
  return TEAM_ALIASES[team] || team;
}

function ownerForTeam(team) {
  return ownerByTeam[canonicalTeam(team)] || "Unassigned";
}

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function matchOwnerLine(match) {
  return `${ownerForTeam(match.teamA)} vs ${ownerForTeam(match.teamB)}`;
}

let state = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { matches: [], champion: "", runnerUp: "" };
  try {
    return JSON.parse(raw);
  } catch {
    return { matches: [], champion: "", runnerUp: "" };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2));
}

function money(n) {
  return `£${Number(n).toFixed(Number(n) % 1 ? 2 : 0)}`;
}

function teamOptions(includeBlank = false) {
  return `${includeBlank ? '<option value="">None / TBC</option>' : ""}` +
    allTeams.map(x => `<option value="${x.team}">${x.team} — ${x.person}</option>`).join("");
}

function initTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active-panel"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active-panel");
    });
  });
}

function initForms() {
  document.getElementById("teamA").innerHTML = teamOptions();
  document.getElementById("teamB").innerHTML = teamOptions();
  document.getElementById("quickGoalTeam").innerHTML = teamOptions(true);
  document.getElementById("matchDate").valueAsDate = new Date();

  document.getElementById("matchForm").addEventListener("submit", e => {
    e.preventDefault();

    const teamA = document.getElementById("teamA").value;
    const teamB = document.getElementById("teamB").value;
    if (teamA === teamB) {
      alert("Team A and Team B cannot be the same.");
      return;
    }

    const quickTeam = document.getElementById("quickGoalTeam").value;
    const quickMinuteRaw = document.getElementById("quickGoalMinute").value;

    state.matches.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date: document.getElementById("matchDate").value,
      teamA,
      teamB,
      goalsA: Number(document.getElementById("goalsA").value),
      goalsB: Number(document.getElementById("goalsB").value),
      cardsA: Number(document.getElementById("cardsA").value),
      cardsB: Number(document.getElementById("cardsB").value),
      quickGoalTeam: quickTeam || "",
      quickGoalMinute: quickMinuteRaw === "" ? null : Number(quickMinuteRaw)
    });

    saveState();
    render();
    e.target.reset();
    document.getElementById("matchDate").valueAsDate = new Date();
  });

  document.getElementById("exportJson").addEventListener("click", exportData);
  document.getElementById("importJson").addEventListener("change", importData);
  document.getElementById("clearData").addEventListener("click", () => {
    if (confirm("Clear all match data?")) {
      state.matches = [];
      saveState();
      render();
    }
  });
}

function calcStats() {
  const teamStats = Object.fromEntries(allTeams.map(x => [x.team, {
    team: x.team, person: x.person, played: 0, for: 0, against: 0, cards: 0
  }]));

  for (const m of state.matches) {
    const teamA = canonicalTeam(m.teamA);
    const teamB = canonicalTeam(m.teamB);
    if (!teamStats[teamA] || !teamStats[teamB]) continue;
    teamStats[teamA].played += 1;
    teamStats[teamB].played += 1;
    teamStats[teamA].for += m.goalsA;
    teamStats[teamA].against += m.goalsB;
    teamStats[teamA].cards += m.cardsA;
    teamStats[teamB].for += m.goalsB;
    teamStats[teamB].against += m.goalsA;
    teamStats[teamB].cards += m.cardsB;
  }

  for (const [team, cards] of Object.entries(FINAL_TEAM_CARDS)) {
    if (teamStats[team]) teamStats[team].cards = cards;
  }

  const people = Object.fromEntries(Object.keys(TEAMS_BY_PERSON).map(person => [person, {
    person, teams: TEAMS_BY_PERSON[person], for: 0, against: 0, cards: 0, played: 0
  }]));

  for (const s of Object.values(teamStats)) {
    people[s.person].for += s.for;
    people[s.person].against += s.against;
    people[s.person].cards += s.cards;
    people[s.person].played += s.played;
  }

  const recordedQuickest = state.matches
    .filter(m => m.quickGoalTeam && m.quickGoalMinute !== null && !Number.isNaN(m.quickGoalMinute))
    .sort((a, b) => a.quickGoalMinute - b.quickGoalMinute || new Date(a.date) - new Date(b.date))[0];

  const quickest = recordedQuickest || {
    teamA: FINAL_QUICKEST_GOAL.team,
    teamB: FINAL_QUICKEST_GOAL.opponent,
    quickGoalTeam: FINAL_QUICKEST_GOAL.team,
    quickGoalMinute: FINAL_QUICKEST_GOAL.minute,
    quickGoalDisplay: FINAL_QUICKEST_GOAL.display,
    date: "2026-06-20T00:00:00Z"
  };

  const gdMatch = state.matches
    .map(m => ({ ...m, goalDiff: Math.abs(m.goalsA - m.goalsB) }))
    .filter(m => m.goalDiff > 0)
    .sort((a, b) => b.goalDiff - a.goalDiff || new Date(a.date) - new Date(b.date))[0];

  return { teamStats, people: Object.values(people), quickest, gdMatch };
}

function finalResult() {
  return state.matches.find(match => String(match.id) === "537390") || null;
}

function recapPrizeRows(stats) {
  const final = finalResult();
  const championTeam = final && final.goalsA !== final.goalsB
    ? (final.goalsA > final.goalsB ? final.teamA : final.teamB)
    : "Spain";
  const runnerTeam = final && final.goalsA !== final.goalsB
    ? (final.goalsA > final.goalsB ? final.teamB : final.teamA)
    : "Argentina";
  const champion = state.champion || ownerForTeam(championTeam);
  const runnerUp = state.runnerUp || ownerForTeam(runnerTeam);
  const maxAgainst = Math.max(...stats.people.map(person => person.against));
  const concededWinners = stats.people.filter(person => person.against === maxAgainst);
  const gdOwners = stats.gdMatch
    ? [...new Set([ownerForTeam(stats.gdMatch.teamA), ownerForTeam(stats.gdMatch.teamB)])]
    : [];

  return [
    { label: "Sweepstake champion", people: champion, detail: `${championTeam} · £100`, status: "confirmed" },
    { label: "Runner-up", people: runnerUp, detail: `${runnerTeam} · £40`, status: "confirmed" },
    { label: "Most goals conceded", people: concededWinners.map(person => person.person).join(" & "), detail: `${maxAgainst} each · £${(25 / concededWinners.length).toFixed(2)} each`, status: "confirmed" },
    { label: "Biggest winning margin", people: gdOwners.join(" & "), detail: stats.gdMatch ? `${stats.gdMatch.teamA} ${stats.gdMatch.goalsA}–${stats.gdMatch.goalsB} ${stats.gdMatch.teamB} · £${(25 / gdOwners.length).toFixed(2)} each` : "Awaiting result", status: stats.gdMatch ? "confirmed" : "pending" },
    { label: "Most cards", people: stats.people.some(person => person.cards > 0) ? leaderTextForMax(stats.people, "cards") : "Awaiting confirmation", detail: "£25 prize", status: stats.people.some(person => person.cards > 0) ? "confirmed" : "pending" },
    { label: "Quickest goal", people: stats.quickest ? `${ownerForTeam(stats.quickest.quickGoalTeam)} · ${stats.quickest.quickGoalTeam}` : "Awaiting confirmation", detail: stats.quickest ? `${stats.quickest.quickGoalDisplay || `${stats.quickest.quickGoalMinute}'`} · £25` : "£25 prize", status: stats.quickest ? "confirmed" : "pending" }
  ];
}

function renderFinalRecap(stats) {
  const rows = recapPrizeRows(stats);
  const amounts = [100, 40, 25, 25, 25, 25];
  const confirmedTotal = rows.reduce((total, row, index) => total + (row.status === "confirmed" ? amounts[index] : 0), 0);
  const remaining = 240 - confirmedTotal;

  document.getElementById("recapWinners").innerHTML = rows.map(row => `
    <article class="recap-winner ${row.status}">
      <span class="recap-status">${row.status === "confirmed" ? "Confirmed" : "To confirm"}</span>
      <small>${escapeHtml(row.label)}</small>
      <strong>${escapeHtml(row.people)}</strong>
      <p>${escapeHtml(row.detail)}</p>
    </article>
  `).join("");
  document.getElementById("confirmedPrizeTotal").textContent = `${money(confirmedTotal)} of £240`;
  document.getElementById("confirmedPrizeBar").style.width = `${(confirmedTotal / 240) * 100}%`;
  document.getElementById("remainingPrizeNote").textContent = remaining
    ? `${money(remaining)} remains awaiting the Most Cards and Quickest Goal records.`
    : "Every prize is confirmed — the full £240 pot has been allocated.";
}

function leaderTextForMax(rows, key) {
  const max = Math.max(...rows.map(r => r[key]));
  if (!Number.isFinite(max) || max <= 0) return "TBC";
  return rows.filter(r => r[key] === max).map(r => `${r.person} (${max})`).join(" / ");
}

function renderDashboard(stats) {
  const people = [...stats.people].sort((a, b) => b.against - a.against || b.cards - a.cards);
  document.getElementById("concededLeader").textContent = leaderTextForMax(stats.people, "against");
  document.getElementById("cardsLeader").textContent = leaderTextForMax(stats.people, "cards");

  document.getElementById("quickestLeader").textContent = stats.quickest
    ? `${ownerForTeam(stats.quickest.quickGoalTeam)} — ${stats.quickest.quickGoalTeam} (${stats.quickest.quickGoalDisplay || `${stats.quickest.quickGoalMinute}'`})`
    : "TBC";

  document.getElementById("gdLeader").textContent = stats.gdMatch
    ? `${stats.gdMatch.teamA} ${stats.gdMatch.goalsA}-${stats.gdMatch.goalsB} ${stats.gdMatch.teamB}`
    : "TBC";

  const recapRows = recapPrizeRows(stats);
  document.getElementById("championLeader").textContent = recapRows[0].people;
  document.getElementById("runnerLeader").textContent = recapRows[1].people;

  document.querySelector("#participantTable tbody").innerHTML = people.map((p, index) => {
    const tags = [];
    const maxAgainst = Math.max(...stats.people.map(x => x.against));
    const maxCards = Math.max(...stats.people.map(x => x.cards));
    if (p.against > 0 && p.against === maxAgainst) tags.push("Most Conceded");
    if (p.cards > 0 && p.cards === maxCards) tags.push("Most Cards");
    return `
      <tr>
        <td data-label="Rank"><span class="rank-badge">#${index + 1}</span></td>
        <td data-label="Person"><strong>${p.person}</strong><small>${p.teams.length} teams</small></td>
        <td data-label="Played">${p.played}</td>
        <td data-label="GF">${p.for}</td>
        <td data-label="GA">${p.against}</td>
        <td data-label="Cards">${p.cards}</td>
        <td data-label="Prize Status">${tags.length ? tags.map(tag => `<span class="tag">${tag}</span>`).join(" ") : "—"}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("prizeTracker").innerHTML = `
    <div class="prize-item"><strong>Champion — £100</strong><span>${recapRows[0].people} · Spain</span></div>
    <div class="prize-item"><strong>Runner-Up — £40</strong><span>${recapRows[1].people} · Argentina</span></div>
    <div class="prize-item"><strong>Most Goals Conceded — £25</strong><span>${document.getElementById("concededLeader").textContent}</span></div>
    <div class="prize-item"><strong>Most Cards — £25</strong><span>${document.getElementById("cardsLeader").textContent}</span></div>
    <div class="prize-item"><strong>Quickest Goal — £25</strong><span>${document.getElementById("quickestLeader").textContent}</span></div>
    <div class="prize-item"><strong>Biggest Goal Difference Match — £25</strong><span>${document.getElementById("gdLeader").textContent}</span></div>
  `;
}

function renderMatches() {
  const sortedMatches = [...state.matches].sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById("matchCount").textContent = `${sortedMatches.length} ${sortedMatches.length === 1 ? "match" : "matches"}`;

  document.querySelector("#matchTable tbody").innerHTML = sortedMatches.map(m => `
    <tr>
      <td>${displayDate(m.date)}</td>
      <td><strong>${escapeHtml(m.teamA)}</strong> vs <strong>${escapeHtml(m.teamB)}</strong></td>
      <td>${escapeHtml(matchOwnerLine(m))}</td>
      <td><strong>${m.goalsA}-${m.goalsB}</strong></td>
      <td>${Math.abs(m.goalsA - m.goalsB)}</td>
      <td>${m.cardsA + m.cardsB}</td>
      <td>${m.quickGoalTeam ? `${escapeHtml(m.quickGoalTeam)} (${m.quickGoalDisplay || `${m.quickGoalMinute}'`})` : "—"}</td>
      <td>${m.source ? `<span class="source-pill">${escapeHtml(m.source)}</span>` : `<button onclick="deleteMatch('${m.id}')" class="danger">Delete</button>`}</td>
    </tr>
  `).join("");

  document.getElementById("matchCards").innerHTML = sortedMatches.map(m => `
    <article class="match-card">
      <div class="match-meta"><span>${displayDate(m.date)}</span>${m.source ? `<span class="source-pill">${escapeHtml(m.source)}</span>` : ""}</div>
      <div class="match-score"><span>${escapeHtml(m.teamA)}</span><strong>${m.goalsA}-${m.goalsB}</strong><span>${escapeHtml(m.teamB)}</span></div>
      <div class="match-owners">${escapeHtml(matchOwnerLine(m))}</div>
      <div class="match-stats"><span>GD ${Math.abs(m.goalsA - m.goalsB)}</span><span>${m.cardsA + m.cardsB} cards</span><span>${m.quickGoalTeam ? `Fastest: ${escapeHtml(m.quickGoalTeam)} ${m.quickGoalDisplay || `${m.quickGoalMinute}'`}` : "No quickest goal"}</span></div>
      ${m.source ? "" : `<button onclick="deleteMatch('${m.id}')" class="danger">Delete</button>`}
    </article>
  `).join("");
}

function deleteMatch(id) {
  state.matches = state.matches.filter(m => m.id !== id);
  saveState();
  render();
}

function renderPeople(stats) {
  document.getElementById("peopleGrid").innerHTML = Object.entries(TEAMS_BY_PERSON).map(([person, teams]) => {
    const p = stats.people.find(x => x.person === person);
    return `
      <article class="person-card">
        <div class="person-head">
          <h2>${person}</h2>
          <p>${p.played} played · GF ${p.for} · GA ${p.against} · Cards ${p.cards}</p>
        </div>
        <div class="team-list">
          ${teams.map(team => {
            const s = stats.teamStats[team];
            return `<div class="team-pill"><span>${team}</span><span>${s.played}P · ${s.for}-${s.against} · ${s.cards} cards</span></div>`;
          }).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderRules() {
  document.getElementById("rulesPrizeTable").innerHTML = PRIZES.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${money(p.amount)}</td>
      <td>${p.criteria}</td>
    </tr>
  `).join("");
}

function exportData() {
  const data = JSON.stringify(state, null, 2);
  document.getElementById("dataOutput").textContent = data;
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fifa-sweepstake-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = JSON.parse(reader.result);
      if (!Array.isArray(state.matches)) throw new Error("Invalid file");
      saveState();
      render();
    } catch (e) {
      alert("Could not import this file.");
    }
  };
  reader.readAsText(file);
}

async function loadSharedData() {
  try {
    const response = await fetch(`data.json?cacheBust=${Date.now()}`);
    if (!response.ok) return;

    const sharedData = await response.json();

    if (Array.isArray(sharedData.matches)) {
      state.matches = sharedData.matches;
      state.updatedAt = sharedData.updatedAt || "";
      saveState();
    }

    if (sharedData.updatedAt) {
      document.getElementById("lastUpdated").textContent = `Updated ${displayDate(sharedData.updatedAt)}`;
    }
  } catch (error) {
    console.warn("Could not load shared data.json", error);
  }
}

function render() {
  const stats = calcStats();
  renderFinalRecap(stats);
  renderDashboard(stats);
  renderMatches();
  renderPeople(stats);
  renderRules();
}

initTabs();
initForms();

loadSharedData().then(() => {
  render();
});
