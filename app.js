
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
  [
    "Champion / Tournament Winner",
    "£100",
    "Owner of the tournament-winning team."
  ],
  [
    "Runner-Up",
    "£40",
    "Owner of the team that finishes second."
  ],
  [
    "Most Goals Conceded",
    "£25",
    "Highest combined goals conceded across all teams owned by one person."
  ],
  [
    "Most Cards",
    "£25",
    "Highest combined yellow + red cards across all teams owned by one person."
  ],
  [
    "Quickest Goal",
    "£25",
    "Owner of the team that scores the earliest confirmed goal."
  ],
  [
    "Biggest Goal Difference Match",
    "£25",
    "Single match with the biggest winning margin. Both team owners split the prize."
  ]
];

const TEAM_NAME_ALIASES = {
  "usa": "United States",
  "us": "United States",
  "united states of america": "United States",
  "south korea": "Korea Republic",
  "republic of korea": "Korea Republic",
  "korea": "Korea Republic",
  "czechia": "Czech Republic",
  "ivory coast": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",
  "cote divoire": "Côte d'Ivoire",
  "curacao": "Curaçao",
  "dr congo": "Congo DR",
  "democratic republic of congo": "Congo DR",
  "congo democratic republic": "Congo DR",
  "bosnia-herzegovina": "Bosnia and Herzegovina",
  "bosnia & herzegovina": "Bosnia and Herzegovina",
  "bosnia": "Bosnia and Herzegovina",
  "cape verde": "Cape Verde Islands",
  "cabo verde": "Cape Verde Islands",
  "ksa": "Saudi Arabia",
  "holland": "Netherlands",
  "nz": "New Zealand",
  "rsa": "South Africa"
};

function canonicalTeamName(name) {
  const cleaned = String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace("’", "'")
    .replace("`", "'")
    .replace("´", "'");
  return TEAM_NAME_ALIASES[cleaned.toLowerCase()] || cleaned;
}

function normaliseMatchTeamNames(match) {
  const teamA = canonicalTeamName(match.teamA || match.homeTeam || match.home || "");
  const teamB = canonicalTeamName(match.teamB || match.awayTeam || match.away || "");
  return {
    ...match,
    teamA,
    teamB,
    ownerA: ownerByTeam[teamA] || match.ownerA || "",
    ownerB: ownerByTeam[teamB] || match.ownerB || ""
  };
}

function normaliseAllMatches(matches) {
  return (matches || []).map(normaliseMatchTeamNames);
}

function matchNumberToStage(matchNumber) {
  const n = Number(matchNumber);
  if (!Number.isFinite(n)) return "";
  if (n >= 73 && n <= 88) return "Round of 32";
  if (n >= 89 && n <= 96) return "Round of 16";
  if (n >= 97 && n <= 100) return "Quarter-finals";
  if (n >= 101 && n <= 102) return "Semi-finals";
  if (n === 103) return "Third Place";
  if (n === 104) return "Final";
  return "";
}

const STORAGE_KEY = "hostuplift_fifa_sweepstake_v4";
const allTeams = Object.entries(TEAMS_BY_PERSON).flatMap(([person, teams]) => teams.map(team => ({ team, person })));
const ownerByTeam = Object.fromEntries(allTeams.map(x => [x.team, x.person]));
let state = loadState();

function loadState() { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return { matches: [], champion: "", runnerUp: "" }; try { return JSON.parse(raw); } catch { return { matches: [], champion: "", runnerUp: "" }; } }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2)); }
function money(n) { return `£${Number(n).toFixed(Number(n) % 1 ? 2 : 0)}`; }
function formatDate(value) { if (!value) return "Date TBC"; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }); }
function normaliseGroupName(value) { if (!value) return "Ungrouped / Knockout / TBC"; return String(value).replaceAll("_"," ").replace(/\b\w/g, c => c.toUpperCase()); }
function teamOptions(includeBlank=false) { return `${includeBlank ? '<option value="">None / TBC</option>' : ""}` + allTeams.map(x => `<option value="${x.team}">${x.team} — ${x.person}</option>`).join(""); }

function initTabs() { document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => { document.querySelectorAll(".tab").forEach(b => b.classList.remove("active")); document.querySelectorAll(".panel").forEach(p => p.classList.remove("active-panel")); btn.classList.add("active"); document.getElementById(btn.dataset.tab).classList.add("active-panel"); })); }
function initForms() {
  document.getElementById("teamA").innerHTML = teamOptions();
  document.getElementById("teamB").innerHTML = teamOptions();
  document.getElementById("quickGoalTeam").innerHTML = teamOptions(true);
  document.getElementById("matchDate").valueAsDate = new Date();
  document.getElementById("matchForm").addEventListener("submit", e => {
    e.preventDefault();
    const teamA = document.getElementById("teamA").value, teamB = document.getElementById("teamB").value;
    if (teamA === teamB) return alert("Team A and Team B cannot be the same.");
    const quickTeam = document.getElementById("quickGoalTeam").value;
    const quickMinuteRaw = document.getElementById("quickGoalMinute").value;
    state.matches.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      date: document.getElementById("matchDate").value,
      group: document.getElementById("matchGroup").value.trim(),
      teamA, teamB, ownerA: ownerByTeam[teamA], ownerB: ownerByTeam[teamB],
      goalsA: Number(document.getElementById("goalsA").value), goalsB: Number(document.getElementById("goalsB").value),
      cardsA: Number(document.getElementById("cardsA").value), cardsB: Number(document.getElementById("cardsB").value),
      quickGoalTeam: quickTeam || "", quickGoalMinute: quickMinuteRaw === "" ? null : Number(quickMinuteRaw), source:"manual"
    });
    saveState(); render(); e.target.reset(); document.getElementById("matchDate").valueAsDate = new Date();
  });
  document.getElementById("exportJson").addEventListener("click", exportData);
  document.getElementById("importJson").addEventListener("change", importData);
  document.getElementById("clearData").addEventListener("click", () => { if(confirm("This only clears your local browser copy. It does not delete public/API match data. Continue?")) { state.matches=[]; saveState(); render(); } });
}

function calcStats() {
  const teamStats = Object.fromEntries(allTeams.map(x => [x.team, { team:x.team, person:x.person, played:0, for:0, against:0, cards:0 }]));
  for (const m of state.matches) {
    if (!teamStats[m.teamA] || !teamStats[m.teamB]) continue;
    const a=Number(m.goalsA||0), b=Number(m.goalsB||0);
    teamStats[m.teamA].played++; teamStats[m.teamB].played++;
    teamStats[m.teamA].for += a; teamStats[m.teamA].against += b; teamStats[m.teamA].cards += Number(m.cardsA||0);
    teamStats[m.teamB].for += b; teamStats[m.teamB].against += a; teamStats[m.teamB].cards += Number(m.cardsB||0);
  }
  const people = Object.fromEntries(Object.keys(TEAMS_BY_PERSON).map(person => [person, { person, teams:TEAMS_BY_PERSON[person], for:0, against:0, cards:0, played:0 }]));
  for (const s of Object.values(teamStats)) { people[s.person].for += s.for; people[s.person].against += s.against; people[s.person].cards += s.cards; people[s.person].played += s.played; }
  const quickest = state.matches.filter(m => m.quickGoalTeam && m.quickGoalMinute !== null && !Number.isNaN(m.quickGoalMinute)).sort((a,b)=>a.quickGoalMinute-b.quickGoalMinute || new Date(a.date)-new Date(b.date))[0];
  const gdMatch = state.matches.map(m => ({...m, goalDiff: Math.abs(Number(m.goalsA||0)-Number(m.goalsB||0))})).filter(m=>m.goalDiff>0).sort((a,b)=>b.goalDiff-a.goalDiff || new Date(a.date)-new Date(b.date))[0];
  return { teamStats, people:Object.values(people), quickest, gdMatch };
}

function leaderTextForMax(rows, key) { const max=Math.max(...rows.map(r=>r[key])); if(!Number.isFinite(max)||max<=0) return "TBC"; return rows.filter(r=>r[key]===max).map(r=>`${r.person} (${max})`).join(" / "); }
function matchWinnerText(m) { const a=Number(m.goalsA||0), b=Number(m.goalsB||0); if(a>b) return `${m.teamA} win`; if(b>a) return `${m.teamB} win`; return "Draw"; }

function renderDashboard(stats) {
  document.getElementById("concededLeader").textContent = leaderTextForMax(stats.people,"against");
  document.getElementById("cardsLeader").textContent = leaderTextForMax(stats.people,"cards");
  document.getElementById("quickestLeader").textContent = stats.quickest ? `${ownerByTeam[stats.quickest.quickGoalTeam]} — ${stats.quickest.quickGoalTeam} (${stats.quickest.quickGoalMinute}')` : "TBC";
  document.getElementById("gdLeader").textContent = stats.gdMatch ? `${stats.gdMatch.teamA} ${stats.gdMatch.goalsA}-${stats.gdMatch.goalsB} ${stats.gdMatch.teamB}` : "TBC";
  document.getElementById("championLeader").textContent = state.champion || "TBC"; document.getElementById("runnerLeader").textContent = state.runnerUp || "TBC";
  const rows=[...stats.people].sort((a,b)=>b.against-a.against || b.cards-a.cards);
  document.querySelector("#participantTable tbody").innerHTML = rows.map(p => {
    const tags=[]; const maxA=Math.max(...stats.people.map(x=>x.against)); const maxC=Math.max(...stats.people.map(x=>x.cards));
    if(p.against>0 && p.against===maxA) tags.push("Most Conceded"); if(p.cards>0 && p.cards===maxC) tags.push("Most Cards");
    return `<tr><td><strong>${p.person}</strong></td><td>${p.teams.length}</td><td>${p.for}</td><td>${p.against}</td><td>${p.cards}</td><td>${tags.length?tags.join(", "):"—"}</td></tr>`;
  }).join("");
  document.getElementById("prizeTracker").innerHTML = getPrizeLeaders(stats).map(p => `<div class="prize-item"><strong>${p.name} — ${p.amount}</strong><span>${p.leader}</span></div>`).join("");
}

function getPrizeLeaders(stats) {
  const conceded=document.getElementById("concededLeader")?.textContent||"TBC", cards=document.getElementById("cardsLeader")?.textContent||"TBC", quickest=document.getElementById("quickestLeader")?.textContent||"TBC", gd=document.getElementById("gdLeader")?.textContent||"TBC";
  return [
    {name:"Champion / Tournament Winner",amount:"£100",leader:state.champion||"TBC after final",status:state.champion?"Confirmed":"Live",detail:"Owner of the tournament-winning team."},
    {name:"Runner-Up",amount:"£40",leader:state.runnerUp||"TBC after final",status:state.runnerUp?"Confirmed":"Live",detail:"Owner of the team that finishes second."},
    {name:"Most Goals Conceded",amount:"£25",leader:conceded,status:conceded==="TBC"?"Waiting for results":"Live leader",detail:"Highest combined goals conceded across all teams owned by one person."},
    {name:"Most Cards",amount:"£25",leader:cards,status:cards==="TBC"?"Waiting for results":"Live leader",detail:"Highest combined yellow + red cards across all teams owned by one person."},
    {name:"Quickest Goal",amount:"£25",leader:quickest,status:quickest==="TBC"?"Waiting for goal timing":"Live leader",detail:"Owner of the team that scores the earliest goal in the tournament."},
    {name:"Biggest Goal Difference Match",amount:"£25",leader:gd,status:gd==="TBC"?"Waiting for results":"Live leader",detail:"Single match with the biggest winning margin. Both team owners split the prize."}
  ];
}

function renderPrizeCards(stats) {
  const box=document.getElementById("prizeCards"); if(!box) return;
  box.innerHTML=getPrizeLeaders(stats).map(p=>`<article class="big-prize-card"><div class="big-prize-top"><span>${p.amount}</span><em>${p.status}</em></div><h2>${p.name}</h2><p>${p.detail}</p><div class="current-leader"><span>Current leader</span><strong>${p.leader}</strong></div></article>`).join("");
}


const KNOCKOUT_STAGES = [
  { key: "round_of_32", label: "Round of 32" },
  { key: "round_of_16", label: "Round of 16" },
  { key: "quarter_finals", label: "Quarter-finals" },
  { key: "semi_finals", label: "Semi-finals" },
  { key: "final", label: "Final" }
];

function getStageKey(value) {
  const v = String(value || "").toLowerCase().trim();
  if (!v) return null;
  if (v.includes("third") || v.includes("3rd")) return "third_place";
  if (v.includes("round of 32") || v.includes("last 32") || v === "r32") return "round_of_32";
  if (v.includes("round of 16") || v.includes("last 16") || v === "r16" || v.includes("knockout round")) return "round_of_16";
  if (v.includes("quarter")) return "quarter_finals";
  if (v.includes("semi")) return "semi_finals";
  if (v == "final" || v.endswith(" final")) return "final";
  return null;
}

function buildKnockoutBuckets(matches) {
  const buckets = Object.fromEntries(KNOCKOUT_STAGES.map(stage => [stage.key, []]));
  const thirdPlace = [];
  for (const m of matches) {
    const key = getStageKey(m.group || m.stage || m.matchday || matchNumberToStage(m.matchNumber || m.match_number || m.fixtureNumber || m.number || m.id) || "");
    if (key === "third_place") thirdPlace.push(m);
    else if (key && buckets[key]) buckets[key].push(m);
  }
  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
  }
  thirdPlace.sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
  return { buckets, thirdPlace };
}

function renderBracketMatch(m) {
  const ownerA = ownerByTeam[m.teamA] || m.ownerA || "Unknown";
  const ownerB = ownerByTeam[m.teamB] || m.ownerB || "Unknown";
  const a = Number(m.goalsA || 0);
  const b = Number(m.goalsB || 0);
  const gd = Math.abs(a - b);
  const winnerText = matchWinnerText(m);
  return `<article class="bracket-match">
    <div class="bracket-row ${a > b ? 'winner-side' : ''}">
      <div><strong>${m.teamA}</strong><span>${ownerA}</span></div>
      <b>${a}</b>
    </div>
    <div class="bracket-row ${b > a ? 'winner-side' : ''}">
      <div><strong>${m.teamB}</strong><span>${ownerB}</span></div>
      <b>${b}</b>
    </div>
    <div class="bracket-meta">
      <span>${formatDate(m.date)}</span>
      <span>${winnerText}</span>
      <span>GD ${gd}</span>
    </div>
  </article>`;
}

function renderKnockout(stats) {
  const grid=document.getElementById("knockoutGrid"), summary=document.getElementById("knockoutSummary"); if(!grid||!summary) return;
  const matches=[...state.matches].sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
  const { buckets, thirdPlace } = buildKnockoutBuckets(matches);
  const bracketCount = Object.values(buckets).reduce((sum, list) => sum + list.length, 0);
  summary.textContent=`${bracketCount} knockout fixture${bracketCount===1?"":"s"}`;

  if(!bracketCount && !thirdPlace.length) {
    grid.innerHTML=`<div class="empty-state">No knockout fixtures logged yet. Once results are added or pulled from the API, this will display a proper 2026 bracket from Round of 32 through to the Final.</div>`;
    return;
  }

  const columns = KNOCKOUT_STAGES.map(stage => {
    const matchesForStage = buckets[stage.key] || [];
    return `<section class="bracket-column">
      <div class="bracket-stage-head">
        <h3>${stage.label}</h3>
        <span>${matchesForStage.length} match${matchesForStage.length===1?"":"es"}</span>
      </div>
      <div class="bracket-stage-body">
        ${matchesForStage.length ? matchesForStage.map(renderBracketMatch).join("") : `<div class="bracket-placeholder">No fixtures logged yet.</div>`}
      </div>
    </section>`;
  }).join("");

  const thirdPlaceHtml = thirdPlace.length ? `<section class="third-place-panel">
    <div class="bracket-stage-head">
      <h3>Third Place</h3>
      <span>${thirdPlace.length} match${thirdPlace.length===1?"":"es"}</span>
    </div>
    <div class="third-place-body">${thirdPlace.map(renderBracketMatch).join("")}</div>
  </section>` : "";

  grid.innerHTML = `<div class="bracket-board">${columns}</div>${thirdPlaceHtml}`;
}

function renderMatches(stats) {
  const matches=[...state.matches].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  document.querySelector("#matchTable tbody").innerHTML=matches.map(m=>`<tr><td>${formatDate(m.date)}</td><td>${normaliseGroupName(m.group||m.stage||m.matchday||"")}</td><td>${m.teamA} vs ${m.teamB}</td><td>${ownerByTeam[m.teamA]||m.ownerA||"Unknown"} vs ${ownerByTeam[m.teamB]||m.ownerB||"Unknown"}</td><td><strong>${m.goalsA}-${m.goalsB}</strong></td><td>${Math.abs(Number(m.goalsA||0)-Number(m.goalsB||0))}</td><td>${Number(m.cardsA||0)+Number(m.cardsB||0)}</td><td>${m.quickGoalTeam?`${m.quickGoalTeam} (${m.quickGoalMinute}')`:"—"}</td></tr>`).join("");
}

function buildGroups(stats) {
  const groupMap={};
  for(const m of state.matches) { const name=normaliseGroupName(m.group||m.stage||m.matchday||""); if(!groupMap[name]) groupMap[name]={name,teams:new Set(),matches:[]}; groupMap[name].teams.add(m.teamA); groupMap[name].teams.add(m.teamB); groupMap[name].matches.push(m); }
  if(!Object.keys(groupMap).length) { for(const [person,teams] of Object.entries(TEAMS_BY_PERSON)) groupMap[person]={name:person,teams:new Set(teams),matches:[]}; }
  return Object.values(groupMap).sort((a,b)=>a.name.localeCompare(b.name));
}

function renderGroups(stats) {
  const grid=document.getElementById("groupsGrid"), summary=document.getElementById("groupsSummary"); if(!grid||!summary) return;
  const groups=buildGroups(stats); summary.textContent=`${groups.length} group${groups.length===1?"":"s"} shown`;
  grid.innerHTML=groups.map(group=>{ const teams=[...group.teams].filter(Boolean).sort((a,b)=>a.localeCompare(b)); const teamRows=teams.map(team=>{ const s=stats.teamStats[team]||{played:0,for:0,against:0,cards:0}; return `<tr><td><strong>${team}</strong></td><td>${ownerByTeam[team]||"Unknown"}</td><td>${s.played||0}</td><td>${s.for||0}</td><td>${s.against||0}</td><td>${s.cards||0}</td></tr>`; }).join(""); const matchRows=group.matches.map(m=>`<tr><td>${formatDate(m.date)}</td><td><strong>${m.teamA}</strong><br><span>${ownerByTeam[m.teamA]||m.ownerA||"Unknown"}</span></td><td class="score-cell">${m.goalsA}-${m.goalsB}</td><td><strong>${m.teamB}</strong><br><span>${ownerByTeam[m.teamB]||m.ownerB||"Unknown"}</span></td><td>${Math.abs(Number(m.goalsA||0)-Number(m.goalsB||0))}</td></tr>`).join(""); return `<article class="group-card"><div class="group-head"><h2>${group.name}</h2><p>${teams.length} teams · ${group.matches.length} matches logged</p></div><h3>Team Table</h3><div class="table-wrap mini-table"><table><thead><tr><th>Team</th><th>Owner</th><th>Played</th><th>For</th><th>Against</th><th>Cards</th></tr></thead><tbody>${teamRows}</tbody></table></div><h3>Matches</h3><div class="table-wrap mini-table"><table><thead><tr><th>Date</th><th>Team A / Owner</th><th>Score</th><th>Team B / Owner</th><th>GD</th></tr></thead><tbody>${matchRows || `<tr><td colspan="5">No match results logged for this group yet.</td></tr>`}</tbody></table></div></article>`; }).join("");
}

function renderPeople(stats) {
  document.getElementById("peopleGrid").innerHTML=Object.entries(TEAMS_BY_PERSON).map(([person,teams])=>{ const p=stats.people.find(x=>x.person===person); return `<article class="person-card"><div class="person-head"><h2>${person}</h2><p>For ${p.for} · Against ${p.against} · Cards ${p.cards}</p></div><div class="team-list">${teams.map(team=>{ const s=stats.teamStats[team]; return `<div class="team-pill"><span>${team}</span><span>For ${s.for} · Against ${s.against} · ${s.cards} cards</span></div>`; }).join("")}</div></article>`; }).join("");
}

function renderRules() { document.getElementById("rulesPrizeTable").innerHTML = PRIZES.map(p=>`<tr><td><strong>${p[0]}</strong></td><td>${p[1]}</td><td>${p[2]}</td></tr>`).join(""); }
function exportData() { const data=JSON.stringify(state,null,2); document.getElementById("dataOutput").textContent=data; const blob=new Blob([data],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="fifa-sweepstake-data.json"; a.click(); URL.revokeObjectURL(url); }
function importData(e) { const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ state=JSON.parse(reader.result); state.matches=normaliseAllMatches(state.matches); if(!Array.isArray(state.matches)) throw new Error("Invalid"); saveState(); render(); }catch{ alert("Could not import this file."); } }; reader.readAsText(file); }
async function loadSharedData() { try { const response=await fetch(`data.json?cacheBust=${Date.now()}`); if(!response.ok) return; const shared=await response.json(); if(Array.isArray(shared.matches)) { state.matches=normaliseAllMatches(shared.matches); saveState(); } } catch(e) { console.warn("Could not load shared data.json", e); } }
function render() { const stats=calcStats(); renderDashboard(stats); renderPrizeCards(stats); renderKnockout(stats); renderMatches(stats); renderGroups(stats); renderPeople(stats); renderRules(); }
initTabs(); initForms(); loadSharedData().then(()=>render());
