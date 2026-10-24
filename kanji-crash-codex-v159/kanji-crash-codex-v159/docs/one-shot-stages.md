# Adding a one-shot challenge

`dist/one-shot-content.js` is the shared browser/Worker content catalogue. Append a stage to `definitions.stages` and increase `version`. Keep released IDs, rewards and meaning stable: an ID stores account clears, device pending events and first-clear claims. Never rename or recycle a released ID. Appending a stage does not require a database migration, UI change or a save reset.

Each stage defines:

| Field | Meaning |
| --- | --- |
| `id` | Unique permanent `shot-…` key |
| `name`, `group`, `condition` | Player-facing title, difficulty and clear condition |
| `hint` | Optional tactical guidance; level guidance is approximate, not an entry restriction |
| `reward` | First-clear coins only |
| `points` | Three target positions; normalized by arena radius, positive `y` in the enemy half, optional angle in radians |
| `enemies` | Three exact catalogue glyphs; defaults to 丁 ×3; no enemy rubies |
| `enemyLevel`, `enemyMultiplier` | Enemy training; defaults to Lv.10 and 1 |
| `playerLevel` | Fixed level (default 10), or `'owned'` to retain actual owned level up to 100 |
| `positioning` | Allow the player to edit the single attacker in their lower half before starting |

The current equipped rubies are retained. Challenge copies never change owned levels, EXP, locks or saved formation presets. A failed attempt does not change RP or grant EXP. The player goes first, fires exactly once, and must defeat all three targets. An existing stage's retry retains its configured starting position. A different stage starts from its default.

Validate definitions with `create`, then validate catalogue glyphs, target geometry and append compatibility with `node tests/one-shot-content.cjs`. Before publishing, run `npm run build`, `npm run test:one-shot` with the configured WebKit environment, and the relevant practice tests. Add an actual physics solution to the mobile test for each new stage: do not move targets or force a victory. Test both a weak and a trained attacker for training stages, legal rotations the UI can select, first reward only once, account persistence, and phone layouts. Confirm a new fixed layout has no initial overlaps; use `KanjiFormation.makeBodies(roster, points, 1/184)` plus `inside`/`overlap` at the fixed battle scale for the enemy roster. Existing three basic layouts retain their original positions for compatibility.

The browser loads this catalogue before `play-records.js`; the Worker imports the same content through `play-records.js`. The UI automatically displays new entries and the account event validator recognizes their IDs after building. Keep browser script versions updated when changing content, and publish the client and Worker together.
