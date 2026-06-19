# HostUplift FIFA Sweepstake Tracker

A custom static website for the HostUplift FIFA sweepstake.

## What it does

- Shows the £240 prize pot and prize breakdown
- Shows all 8 participants and their teams
- Lets someone enter match results
- Automatically updates:
  - Most Goals Conceded
  - Most Cards
  - Quickest Goal
  - Biggest Goal Difference Match
  - Participant totals
  - Prize tracker
- Saves data in the browser using localStorage
- Allows JSON export/import for backup

## How to use locally

Open `index.html` in your browser.

## How to share with the team

Best free hosting options:

1. Netlify Drop
   - Go to Netlify
   - Drag the whole folder onto Netlify Drop
   - Share the published URL in Slack

2. GitHub Pages
   - Create a GitHub repo
   - Upload the files
   - Enable Pages

## Important limitation

This version calculates everything from the Match Log.

For true live auto-updates from official match data, you need:
- a football data API key
- a small backend/serverless function
- scheduled polling for fixtures, goals, cards and match events

That can be added later without changing the overall design.


## Update: no public match deletion

This version removes the delete button from previous match results and makes the results table clearer by showing team owners, score, goal difference, cards, and quickest goal.

If a result needs correcting, update the source data/API file rather than deleting rows on the public page.
