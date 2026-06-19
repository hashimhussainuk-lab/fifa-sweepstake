
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

const ownerByTeam = Object.fromEntries(allTeams.map(x => [x.team, x.person]));

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
    if (!teamStats[m.teamA] || !teamStats[m.teamB]) continue;
    teamStats[m.teamA].played += 1;
    teamStats[m.teamB].played += 1;
    teamStats[m.teamA].for += m.goalsA;
    teamStats[m.teamA].against += m.goalsB;
    teamStats[m.teamA].cards += m.cardsA;
    teamStats[m.teamB].for += m.goalsB;
    teamStats[m.teamB].against += m.goalsA;
    teamStats[m.teamB].cards += m.cardsB;
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

  const quickest = state.matches
    .filter(m => m.quickGoalTeam && m.quickGoalMinute !== null && !Number.isNaN(m.quickGoalMinute))
    .sort((a, b) => a.quickGoalMinute - b.quickGoalMinute || new Date(a.date) - new Date(b.date))[0];

  const gdMatch = state.matches
    .map(m => ({ ...m, goalDiff: Math.abs(m.goalsA - m.goalsB) }))
    .filter(m => m.goalDiff > 0)
    .sort((a, b) => b.goalDiff - a.goalDiff || new Date(a.date) - new Date(b.date))[0];

  return { teamStats, people: Object.values(people), quickest, gdMatch };
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
    ? `${ownerByTeam[stats.quickest.quickGoalTeam]} — ${stats.quickest.quickGoalTeam} (${stats.quickest.quickGoalMinute}')`
    : "TBC";

  document.getElementById("gdLeader").textContent = stats.gdMatch
    ? `${stats.gdMatch.teamA} ${stats.gdMatch.goalsA}-${stats.gdMatch.goalsB} ${stats.gdMatch.teamB}`
    : "TBC";

  document.getElementById("championLeader").textContent = state.champion || "TBC";
  document.getElementById("runnerLeader").textContent = state.runnerUp || "TBC";

  document.querySelector("#participantTable tbody").innerHTML = people.map(p => {
    const tags = [];
    const maxAgainst = Math.max(...stats.people.map(x => x.against));
    const maxCards = Math.max(...stats.people.map(x => x.cards));
    if (p.against > 0 && p.against === maxAgainst) tags.push("Most Conceded");
    if (p.cards > 0 && p.cards === maxCards) tags.push("Most Cards");
    return `
      <tr>
        <td><strong>${p.person}</strong></td>
        <td>${p.teams.length}</td>
        <td>${p.for}</td>
        <td>${p.against}</td>
        <td>${p.cards}</td>
        <td>${tags.length ? tags.join(", ") : "—"}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("prizeTracker").innerHTML = `
    <div class="prize-item"><strong>Champion — £100</strong><span>${state.champion || "TBC after final"}</span></div>
    <div class="prize-item"><strong>Runner-Up — £40</strong><span>${state.runnerUp || "TBC after final"}</span></div>
    <div class="prize-item"><strong>Most Goals Conceded — £25</strong><span>${document.getElementById("concededLeader").textContent}</span></div>
    <div class="prize-item"><strong>Most Cards — £25</strong><span>${document.getElementById("cardsLeader").textContent}</span></div>
    <div class="prize-item"><strong>Quickest Goal — £25</strong><span>${document.getElementById("quickestLeader").textContent}</span></div>
    <div class="prize-item"><strong>Biggest Goal Difference Match — £25</strong><span>${document.getElementById("gdLeader").textContent}</span></div>
  `;
}

function renderMatches() {
  const tbody = document.querySelector("#matchTable tbody");
  tbody.innerHTML = state.matches.map(m => `
    <tr>
      <td>${m.date || "—"}</td>
      <td>${m.teamA} vs ${m.teamB}</td>
      <td><strong>${m.goalsA}-${m.goalsB}</strong></td>
      <td>${Math.abs(m.goalsA - m.goalsB)}</td>
      <td>${m.cardsA + m.cardsB}</td>
      <td>${m.quickGoalTeam ? `${m.quickGoalTeam} (${m.quickGoalMinute}')` : "—"}</td>
      <td><button onclick="deleteMatch('${m.id}')" class="danger">Delete</button></td>
    </tr>
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
          <p>GF ${p.for} · GA ${p.against} · Cards ${p.cards}</p>
        </div>
        <div class="team-list">
          ${teams.map(team => {
            const s = stats.teamStats[team];
            return `<div class="team-pill"><span>${team}</span><span>${s.for}-${s.against} · ${s.cards} cards</span></div>`;
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

function render() {
  const stats = calcStats();
  renderDashboard(stats);
  renderMatches();
  renderPeople(stats);
  renderRules();
}

initTabs();
initForms();
render();
