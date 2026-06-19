# HostUplift FIFA Sweepstake Tracker

This version includes:
- Separate Prizes tab
- Knockout-style match tracking tab
- Groups tab
- People tab
- Dashboard
- No public match delete button
- `data.json` loading for GitHub/API workflow

To deploy, replace your GitHub repo's `index.html`, `styles.css`, `app.js`, and `README.md` with these files and merge to `main`.


## Knockout bracket update

The knockout tab now uses the correct 2026 World Cup structure:
- Round of 32
- Round of 16
- Quarter-finals
- Semi-finals
- Final
- optional Third Place match

To place a match in the correct column, set the match `group` or `stage` field to values like `Round of 32`, `Quarter-final`, or `Final`.


## Name mapping update

This version includes team-name mapping in both `app.js` and `scripts/update-data.js`.

Examples:
- `USA` → `United States`
- `South Korea` → `Korea Republic`
- `Czechia` → `Czech Republic`
- `Ivory Coast` → `Côte d'Ivoire`
- `DR Congo` → `Congo DR`
- `Cabo Verde` → `Cape Verde Islands`
- `Bosnia` → `Bosnia and Herzegovina`
- `Curacao` → `Curaçao`

It also maps 2026 knockout match numbers:
- 73–88 → Round of 32
- 89–96 → Round of 16
- 97–100 → Quarter-finals
- 101–102 → Semi-finals
- 103 → Third Place
- 104 → Final
