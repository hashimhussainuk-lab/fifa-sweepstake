const fs = require("fs");

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
if (!API_KEY) throw new Error("Missing FOOTBALL_DATA_API_KEY");

const TEAM_OWNERS = {
  "Morocco": "Adam", "Mexico": "Adam", "Croatia": "Adam", "Netherlands": "Adam", "Czech Republic": "Adam", "Bosnia and Herzegovina": "Adam",
  "Spain": "Zach", "Norway": "Zach", "Senegal": "Zach", "Japan": "Zach", "Saudi Arabia": "Zach", "Turkey": "Zach",
  "England": "Joe D", "Austria": "Joe D", "Cape Verde Islands": "Joe D", "Sweden": "Joe D", "Switzerland": "Joe D", "Iran": "Joe D",
  "Paraguay": "Laura", "Scotland": "Laura", "Egypt": "Laura", "Belgium": "Laura", "Portugal": "Laura", "Ecuador": "Laura",
  "Curaçao": "Joe S", "Côte d'Ivoire": "Joe S", "Congo DR": "Joe S", "United States": "Joe S", "Uzbekistan": "Joe S", "Canada": "Joe S",
  "Australia": "Faizan", "Haiti": "Faizan", "Ghana": "Faizan", "Panama": "Faizan", "Tunisia": "Faizan", "Argentina": "Faizan",
  "Jordan": "Hashim", "New Zealand": "Hashim", "Uruguay": "Hashim", "South Africa": "Hashim", "Iraq": "Hashim", "Qatar": "Hashim",
  "Colombia": "Yen", "Germany": "Yen", "Algeria": "Yen", "Brazil": "Yen", "Korea Republic": "Yen", "France": "Yen"
};

const TEAM_NAME_ALIASES = {
  "usa": "United States", "us": "United States", "united states of america": "United States",
  "south korea": "Korea Republic", "republic of korea": "Korea Republic", "korea": "Korea Republic",
  "czechia": "Czech Republic",
  "ivory coast": "Côte d'Ivoire", "cote d'ivoire": "Côte d'Ivoire", "cote divoire": "Côte d'Ivoire",
  "curacao": "Curaçao",
  "dr congo": "Congo DR", "democratic republic of congo": "Congo DR",
  "bosnia-herzegovina": "Bosnia and Herzegovina", "bosnia & herzegovina": "Bosnia and Herzegovina", "bosnia": "Bosnia and Herzegovina",
  "cape verde": "Cape Verde Islands", "cabo verde": "Cape Verde Islands",
  "ksa": "Saudi Arabia", "holland": "Netherlands", "nz": "New Zealand", "rsa": "South Africa"
};

function canonicalTeamName(name) {
  const cleaned = String(name || "").trim().replace(/\s+/g, " ");
  return TEAM_NAME_ALIASES[cleaned.toLowerCase()] || cleaned;
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

function getMatchNumber(match) {
  return match.matchNumber || match.match_number || match.fixtureNumber || match.number || match.id || "";
}

async function main() {
  const url = "https://api.football-data.org/v4/competitions/WC/matches";
  const res = await fetch(url, { headers: { "X-Auth-Token": API_KEY } });
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${await res.text()}`);

  const apiData = await res.json();

  const matches = (apiData.matches || [])
    .filter(match => match.status === "FINISHED")
    .map(match => {
      const matchNumber = getMatchNumber(match);
      const teamA = canonicalTeamName(match.homeTeam?.name || "");
      const teamB = canonicalTeamName(match.awayTeam?.name || "");
      const stage = match.stage || match.group || matchNumberToStage(matchNumber);

      return {
        id: String(match.id),
        matchNumber,
        date: match.utcDate,
        group: stage,
        stage,
        teamA,
        teamB,
        ownerA: TEAM_OWNERS[teamA] || "",
        ownerB: TEAM_OWNERS[teamB] || "",
        goalsA: match.score?.fullTime?.home ?? 0,
        goalsB: match.score?.fullTime?.away ?? 0,
        cardsA: 0,
        cardsB: 0,
        quickGoalTeam: "",
        quickGoalMinute: null,
        source: "football-data.org"
      };
    })
    .filter(match => TEAM_OWNERS[match.teamA] || TEAM_OWNERS[match.teamB]);

  fs.writeFileSync("data.json", JSON.stringify({
    updatedAt: new Date().toISOString(),
    note: "Scores are API-updated. Cards and quickest goal may require manual entry unless event data is added.",
    matches
  }, null, 2));

  console.log(`Updated data.json with ${matches.length} matches.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
