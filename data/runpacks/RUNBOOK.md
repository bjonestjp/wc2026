## Starter Run Pack

This folder contains starter files for dry runs:

- `current-fixtures.template.json`
- `dummy-results.json`
- `test-trivia.json`

### Important note

At the moment, your local database only contains **one fixture**, so the fixture template and dummy results file also only contain **one match**.

Once you have entered the full match structure in the admin UI, refresh the fixture template with:

```bash
npm run fixtures:export -- --output data/runpacks/current-fixtures.template.json
```

Then you can run a compressed test schedule with:

```bash
npm run reset:tournament -- --keep-users
npm run fixtures:load -- --input data/runpacks/current-fixtures.template.json --mode compressed --start 2026-05-01T09:00:00Z --interval-minutes 5 --stage-gap-minutes 30
npm run trivia:load -- --input data/runpacks/test-trivia.json --set TEST
npm run results:load -- --input data/runpacks/dummy-results.json
```

For the real pool:

```bash
npm run reset:tournament -- --keep-users
npm run fixtures:load -- --input data/runpacks/current-fixtures.template.json --mode preserve
```

### Expanding the files

As soon as the full fixture structure exists, update:

1. `current-fixtures.template.json` by re-exporting it
2. `dummy-results.json` by copying the fixture structure and adding scores
3. `test-trivia.json` with however many daily questions you want for the rehearsal
