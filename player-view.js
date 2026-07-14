const PLAYER_VIEW_KEY = "hostuplift_selected_player";

function playerViewSafe(value) {
  return typeof escapeHtml === "function" ? escapeHtml(value) : String(value ?? "");
}

function playerViewDate(value) {
  return typeof displayDate === "function" ? displayDate(value) : String(value || "—");
}

function playerPrizeTags(name, stats) {
  const tags = [];
  const maxAgainst = Math.max(...stats.people.map(person => person.against));
  const maxCards = Math.max(...stats.people.map(person => person.cards));
  const person = stats.people.find(item => item.person === name);
  if (person && person.against > 0 && person.against === maxAgainst) tags.push("Leading: Most Conceded");
  if (person && person.cards > 0 && person.cards === maxCards) tags.push("Leading: Most Cards");
  if (stats.quickest && ownerForTeam(stats.quickest.quickGoalTeam) === name) tags.push("Leading: Quickest Goal");
  if (stats.gdMatch && [ownerForTeam(stats.gdMatch.teamA), ownerForTeam(stats.gdMatch.teamB)].includes(name)) tags.push("In: Biggest Margin Match");
  if (!tags.length) tags.push("No side-prize lead yet");
  return tags;
}

function renderPlayerView(name) {
  const empty = document.getElementById("playerEmpty");
  const panel = document.getElementById("playerWelcome");
  if (!name || !TEAMS_BY_PERSON[name]) {
    empty.hidden = false;
    panel.hidden = true;
    return;
  }

  localStorage.setItem(PLAYER_VIEW_KEY, name);
  empty.hidden = true;
  panel.hidden = false;

  const stats = calcStats();
  const person = stats.people.find(item => item.person === name);
  const teams = TEAMS_BY_PERSON[name];
  const relevantMatches = [...state.matches]
    .filter(match => teams.includes(canonicalTeam(match.teamA)) || teams.includes(canonicalTeam(match.teamB)))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  document.getElementById("playerGreeting").textContent = name + "’s sweepstake";
  document.getElementById("playerStatus").textContent = person.played + " team appearances · " + person.for + " goals for";

  document.getElementById("myTeams").innerHTML = teams.map(team => {
    const teamStats = stats.teamStats[team];
    return '<article class="my-team"><strong>' + playerViewSafe(team) + '</strong><span>' +
      teamStats.played + ' played · ' + teamStats.for + '-' + teamStats.against + ' · ' + teamStats.cards + ' cards</span></article>';
  }).join("");

  document.getElementById("myPrizeRace").innerHTML = playerPrizeTags(name, stats)
    .map(tag => '<div class="personal-row"><strong>' + playerViewSafe(tag) + '</strong></div>').join("");

  document.getElementById("myRecentMatches").innerHTML = relevantMatches.length
    ? relevantMatches.map(match => {
        const score = match.goalsA + "-" + match.goalsB;
        return '<div class="personal-row"><strong>' + playerViewSafe(match.teamA) + ' ' + score + ' ' +
          playerViewSafe(match.teamB) + '</strong><span>' + playerViewDate(match.date) + '</span></div>';
      }).join("")
    : '<div class="personal-row"><span>No matches recorded yet.</span></div>';
}

function simplifyDashboard() {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard || document.getElementById("playerHome")) return;

  const playerHome = document.createElement("section");
  playerHome.id = "playerHome";
  playerHome.className = "player-home card";
  playerHome.innerHTML = `
    <div class="player-picker">
      <div><p class="eyebrow">Personal view</p><h2>Show me my sweepstake</h2><p>Choose your name once. This device will remember you.</p></div>
      <label for="playerSelect">Participant<select id="playerSelect"><option value="">Choose your name</option></select></label>
    </div>
    <div id="playerEmpty" class="player-empty">Select your name to see only your teams, prize chances and latest results.</div>
    <div id="playerWelcome" class="player-welcome" hidden>
      <div class="player-summary-head"><h3 id="playerGreeting"></h3><span id="playerStatus" class="player-status"></span></div>
      <div id="myTeams" class="my-team-grid"></div>
      <div class="personal-grid">
        <section class="personal-block"><h3>My prize position</h3><div id="myPrizeRace" class="personal-list"></div></section>
        <section class="personal-block"><h3>My latest matches</h3><div id="myRecentMatches" class="personal-list"></div></section>
      </div>
    </div>`;

  dashboard.insertBefore(playerHome, dashboard.firstChild);

  const select = document.getElementById("playerSelect");
  select.innerHTML += Object.keys(TEAMS_BY_PERSON).map(name =>
    '<option value="' + playerViewSafe(name) + '">' + playerViewSafe(name) + '</option>'
  ).join("");
  select.addEventListener("change", event => renderPlayerView(event.target.value));

  const metrics = dashboard.querySelector(".metrics");
  if (metrics) {
    const details = document.createElement("details");
    details.id = "prizeDetails";
    details.className = "home-details";
    details.innerHTML = '<summary><span>All prize leaders</span><small>Tap to expand ＋</small></summary>';
    metrics.parentNode.insertBefore(details, metrics);
    details.appendChild(metrics);
  }

  const twoCol = dashboard.querySelector(".two-col");
  if (twoCol) {
    const cards = [...twoCol.children];
    cards.forEach((card, index) => {
      const details = document.createElement("details");
      details.className = "home-details";
      const title = index === 0 ? "Full participant leaderboard" : "Complete prize tracker";
      details.innerHTML = '<summary><span>' + title + '</span><small>Tap to expand ＋</small></summary>';
      twoCol.parentNode.insertBefore(details, twoCol);
      details.appendChild(card);
    });
    twoCol.remove();
  }

  const tabs = document.querySelectorAll(".sticky-tabs .tab");
  const labels = ["Home", "Matches", "All players", "Prizes", "Organiser"];
  tabs.forEach((tab, index) => { if (labels[index]) tab.textContent = labels[index]; });

  const saved = localStorage.getItem(PLAYER_VIEW_KEY);
  if (saved && TEAMS_BY_PERSON[saved]) {
    select.value = saved;
    renderPlayerView(saved);
  }

  const observer = new MutationObserver(() => {
    if (select.value) renderPlayerView(select.value);
  });
  const matchBody = document.querySelector("#matchTable tbody");
  if (matchBody) observer.observe(matchBody, { childList: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", simplifyDashboard);
} else {
  simplifyDashboard();
}
