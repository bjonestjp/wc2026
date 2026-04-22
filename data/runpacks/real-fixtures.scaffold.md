## Real Fixture Scaffold

This file is a clean source-of-truth scaffold for the real 2026 World Cup schedule:

- [real-fixtures.scaffold.json](/Users/bradjones/Documents/current work/apr26/wc codex/data/runpacks/real-fixtures.scaffold.json)

What is included:

- all 72 group-stage pairings based on the current teams and group assignments in your local database
- all 16 Round of 32 placeholders
- all 8 Round of 16 placeholders
- all 4 quarter-final placeholders
- all 2 semi-final placeholders
- third-place match placeholder
- final placeholder

What still needs to be filled in:

- the official `kickoffAt` value for every match
- the official ordering of group matches, if you want it to match FIFA exactly rather than just have the right pairings

This scaffold is intentionally simple and editable. Once you fill in the official kickoff times, you can use it directly with:

```bash
npm run fixtures:load -- --input data/runpacks/real-fixtures.scaffold.json --mode preserve
```

For a rehearsal, you can use the exact same structure on a compressed schedule:

```bash
npm run fixtures:load -- --input data/runpacks/real-fixtures.scaffold.json --mode compressed --start 2026-05-01T09:00:00Z --interval-minutes 5 --stage-gap-minutes 30
```
