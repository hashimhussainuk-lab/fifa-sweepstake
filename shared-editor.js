const SUPABASE_CONFIG = window.SWEEPSTAKE_SUPABASE;
const ADMIN_EMAIL = "hashim.hussain.uk@gmail.com";
const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
let sharedOverrides = new Map();

function setEditorStatus(message, type = "") {
  const element = document.getElementById("editorStatus");
  if (!element) return;
  element.textContent = message;
  element.className = "editor-status " + type;
}

function mergeSharedOverrides(rows) {
  sharedOverrides = new Map((rows || []).map(row => [String(row.match_id), row]));
  state.matches = state.matches.map(match => {
    const override = sharedOverrides.get(String(match.id));
    if (!override) return match;
    return {
      ...match,
      goalsA: override.score_a ?? match.goalsA,
      goalsB: override.score_b ?? match.goalsB,
      cardsA: Number(override.yellow_a || 0) + Number(override.red_a || 0),
      cardsB: Number(override.yellow_b || 0) + Number(override.red_b || 0),
      quickGoalTeam: override.quick_goal_team || "",
      quickGoalMinute: override.quick_goal_minute ?? null,
      manualNotes: override.notes || ""
    };
  });
}

async function loadSharedManualData() {
  const [{ data: overrides, error: overrideError }, { data: settings, error: settingsError }] = await Promise.all([
    supabaseClient.from("match_overrides").select("*"),
    supabaseClient.from("sweepstake_settings").select("*")
  ]);
  if (overrideError || settingsError) {
    console.warn("Shared organiser data is not ready.", overrideError || settingsError);
    return;
  }
  mergeSharedOverrides(overrides);
  const settingMap = Object.fromEntries((settings || []).map(item => [item.key, item.value]));
  state.champion = settingMap.champion || "";
  state.runnerUp = settingMap.runner_up || "";
  render();
  if (document.getElementById("playerSelect")?.value) renderPlayerView(document.getElementById("playerSelect").value);
}

function populateOverrideMatchSelect() {
  const select = document.getElementById("overrideMatch");
  const matches = [...state.matches].sort((a, b) => new Date(b.date) - new Date(a.date));
  select.innerHTML = '<option value="">Choose a match</option>' + matches.map(match =>
    '<option value="' + playerViewSafe(match.id) + '">' + playerViewSafe(playerViewDate(match.date) + " · " + match.teamA + " " + match.goalsA + "-" + match.goalsB + " " + match.teamB) + '</option>'
  ).join("");
}

function fillOverrideForm(matchId) {
  const match = state.matches.find(item => String(item.id) === String(matchId));
  if (!match) return;
  const override = sharedOverrides.get(String(matchId)) || {};
  document.getElementById("overrideScoreA").value = override.score_a ?? match.goalsA;
  document.getElementById("overrideScoreB").value = override.score_b ?? match.goalsB;
  document.getElementById("overrideYellowA").value = override.yellow_a ?? 0;
  document.getElementById("overrideRedA").value = override.red_a ?? 0;
  document.getElementById("overrideYellowB").value = override.yellow_b ?? 0;
  document.getElementById("overrideRedB").value = override.red_b ?? 0;
  const teamSelect = document.getElementById("overrideQuickTeam");
  teamSelect.innerHTML = '<option value="">No quickest goal recorded</option><option>' + playerViewSafe(match.teamA) + '</option><option>' + playerViewSafe(match.teamB) + '</option>';
  teamSelect.value = override.quick_goal_team || "";
  document.getElementById("overrideQuickMinute").value = override.quick_goal_minute ?? "";
  document.getElementById("overrideNotes").value = override.notes || "";
}

async function saveOverride(event) {
  event.preventDefault();
  const matchId = document.getElementById("overrideMatch").value;
  if (!matchId) return setEditorStatus("Choose a match first.", "error");
  const payload = {
    match_id: matchId,
    score_a: Number(document.getElementById("overrideScoreA").value),
    score_b: Number(document.getElementById("overrideScoreB").value),
    yellow_a: Number(document.getElementById("overrideYellowA").value || 0),
    red_a: Number(document.getElementById("overrideRedA").value || 0),
    yellow_b: Number(document.getElementById("overrideYellowB").value || 0),
    red_b: Number(document.getElementById("overrideRedB").value || 0),
    quick_goal_team: document.getElementById("overrideQuickTeam").value || null,
    quick_goal_minute: document.getElementById("overrideQuickMinute").value === "" ? null : Number(document.getElementById("overrideQuickMinute").value),
    notes: document.getElementById("overrideNotes").value.trim() || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabaseClient.from("match_overrides").upsert(payload);
  if (error) return setEditorStatus(error.message, "error");
  setEditorStatus("Saved. Everyone using the site will now see this information.", "success");
  await reloadFromSources();
}

async function saveFinalists() {
  const rows = [
    { key: "champion", value: document.getElementById("settingChampion").value, updated_at: new Date().toISOString() },
    { key: "runner_up", value: document.getElementById("settingRunnerUp").value, updated_at: new Date().toISOString() }
  ];
  const { error } = await supabaseClient.from("sweepstake_settings").upsert(rows);
  if (error) return setEditorStatus(error.message, "error");
  setEditorStatus("Champion and runner-up saved.", "success");
  await reloadFromSources();
}

async function reloadFromSources() {
  await loadSharedData();
  await loadSharedManualData();
  populateOverrideMatchSelect();
}

async function renderAuthState() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const loggedIn = session?.user?.email?.toLowerCase() === ADMIN_EMAIL;
  document.getElementById("organiserAuth").hidden = loggedIn;
  document.getElementById("sharedEditor").hidden = !loggedIn;
  if (loggedIn) {
    populateOverrideMatchSelect();
    setEditorStatus("Signed in as " + session.user.email, "success");
  }
}

async function initSharedEditor() {
  const dataPanel = document.getElementById("data");
  const editor = document.createElement("section");
  editor.className = "card shared-editor";
  editor.innerHTML = `
    <div class="card-head"><div><p class="eyebrow">Shared organiser editor</p><h2>Add missing prize information</h2></div><p>Secure changes are shared with every visitor and are not overwritten by the football API.</p></div>
    <div id="organiserAuth"><div class="auth-row"><label>Organiser email<input id="organiserEmail" type="email" value="${ADMIN_EMAIL}" readonly></label><button id="sendLoginLink">Email secure login link</button></div><p class="editor-note">Only the approved organiser email can save changes.</p></div>
    <div id="sharedEditor" hidden>
      <form id="overrideForm" class="override-form">
        <label class="full">Match<select id="overrideMatch" required></select></label>
        <label>Team A score<input id="overrideScoreA" type="number" min="0" required></label><label>Team B score<input id="overrideScoreB" type="number" min="0" required></label>
        <label>Team A yellows<input id="overrideYellowA" type="number" min="0" value="0"></label><label>Team A reds<input id="overrideRedA" type="number" min="0" value="0"></label>
        <label>Team B yellows<input id="overrideYellowB" type="number" min="0" value="0"></label><label>Team B reds<input id="overrideRedB" type="number" min="0" value="0"></label>
        <label class="wide">Quickest goal team<select id="overrideQuickTeam"></select></label><label class="wide">Quickest goal minute<input id="overrideQuickMinute" type="number" min="0" max="130"></label>
        <label class="full">Notes<textarea id="overrideNotes" rows="2" placeholder="Optional correction note"></textarea></label>
        <div class="override-actions full"><button type="submit">Save shared match details</button><button id="signOutOrganiser" type="button" class="danger">Sign out</button></div>
      </form>
      <div class="override-form">
        <label class="wide">Champion<select id="settingChampion"><option value="">TBC</option>${Object.keys(TEAMS_BY_PERSON).map(name => '<option>' + playerViewSafe(name) + '</option>').join("")}</select></label>
        <label class="wide">Runner-up<select id="settingRunnerUp"><option value="">TBC</option>${Object.keys(TEAMS_BY_PERSON).map(name => '<option>' + playerViewSafe(name) + '</option>').join("")}</select></label>
        <div class="override-actions full"><button id="saveFinalists" type="button">Save finalists</button></div>
      </div>
    </div>
    <p id="editorStatus" class="editor-status"></p>`;
  dataPanel.insertBefore(editor, dataPanel.firstChild);

  document.getElementById("sendLoginLink").addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signInWithOtp({ email: ADMIN_EMAIL, options: { emailRedirectTo: location.origin + location.pathname } });
    setEditorStatus(error ? error.message : "Login link sent. Open it on this device.", error ? "error" : "success");
  });
  document.getElementById("overrideMatch").addEventListener("change", event => fillOverrideForm(event.target.value));
  document.getElementById("overrideForm").addEventListener("submit", saveOverride);
  document.getElementById("saveFinalists").addEventListener("click", saveFinalists);
  document.getElementById("signOutOrganiser").addEventListener("click", async () => { await supabaseClient.auth.signOut(); await renderAuthState(); });
  await reloadFromSources();
  await renderAuthState();
  supabaseClient.auth.onAuthStateChange(() => setTimeout(renderAuthState, 0));
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSharedEditor);
else initSharedEditor();
