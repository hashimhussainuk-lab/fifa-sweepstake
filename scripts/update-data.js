const fs = require("fs");

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

if (!API_KEY) {
  throw new Error("Missing FOOTBALL_DATA_API_KEY");
}

const TEAM_OWNERS = {
  "Morocco": "Adam",
  "Mexico": "Adam",
  "Croatia": "Adam",
  "Netherlands": "Adam",
  "Czech Republic": "Adam",
  "Bosnia and Herzegovina": "Adam",

  "Spain": "Zach",
  "Norway": "Zach",
  "Senegal": "Zach",
  "Japan": "Zach",
  "Saudi Arabia": "Zach",
  "Turkey": "Zach",

  "England": "Joe D",
  "Austria": "Joe D",
  "Cape Verde Islands": "Joe D",
  "Sweden": "Joe D",
  "Switzerland": "Joe D",
  "Iran": "Joe D",

  "Paraguay": "Laura",
  "Scotland": "Laura",
  "Egypt": "Laura",
  "Belgium": "Laura",
  "Portugal": "Laura",
  "Ecuador": "Laura",

  "Curaçao": "Joe S",
  "Côte d'Ivoire": "Joe S",
  "Congo DR": "Joe S",
  "United States": "Joe S",
  "Uzbekistan": "Joe S",
  "Canada": "Joe S",

  "Australia": "Faizan",
  "Haiti": "Faizan",
  "Ghana": "Faizan",
  "Panama": "Faizan",
  "Tunisia": "Faizan",
  "Argentina": "Faizan",

  "Jordan": "Hashim",
  "New Zealand": "Hashim",
  "Uruguay": "Hashim",
  "South Africa": "Hashim",
  "Iraq": "Hashim",
  "Qatar": "Hashim",

  "Colombia": "Yen",
  "Germany": "Yen",
  "Algeria": "Yen",
  "Brazil": "Yen",
  "Korea Republic": "Yen",
  "France": "Yen"
};

async function main() {
  const url = "https://api.football-data.org/v4/competitions/WC/matches";

  const res = await fetch(url, {
    headers: {
      "X-Auth-Token": API_KEY
    }
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${await res.text()}`);
  }

  const apiData = await res.json();

  const matches = (apiData.matches || [])
    .filter(match => match.status === "FINISHED")
    .map(match => {
      const homeTeam = match.homeTeam?.name || "";
      const awayTeam = match.awayTeam?.name || "";

      return {
        id: String(match.id),
        date: match.utcDate,
        teamA: homeTeam,
        teamB: awayTeam,
        ownerA: TEAM_OWNERS[homeTeam] || "",
        ownerB: TEAM_OWNERS[awayTeam] || "",
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

  const output = {
    updatedAt: new Date().toISOString(),
    note: "Scores are API-updated. Cards and quickest goal may require manual entry unless event data is added.",
    matches
  };

  fs.writeFileSync("data.json", JSON.stringify(output, null, 2));
  console.log(`Updated data.json with ${matches.length} matches.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
