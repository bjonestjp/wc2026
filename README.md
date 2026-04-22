## WC 2026 pool web app

Invite-only pool for the 2026 World Cup:

- **Primary**: passive “team draw” competition (admin assigns 1+ teams per user).
- **Secondary**: daily match outcome picks (H/D/A) with points + streak bonus.

## Getting Started

### Prereqs

- Node.js + npm
- A Postgres database (set `DATABASE_URL`). For hosted Postgres, prefer `sslmode=verify-full` in the connection string.

### Run locally

1) Install deps

```bash
npm install
```

2) Set env vars

```bash
cp .env.example .env
```

3) Run migrations + seed

```bash
npx prisma migrate dev
npx prisma db seed
```

4) Start the dev server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open `http://localhost:3000`.

### Run tests locally

This project uses `vitest` for local unit tests.

```bash
npm run test
```

For a one-shot run in CI style:

```bash
npm run test:run
```

The initial test suite covers pure server-side helpers in `tests/`. For client-component tests later on, use a per-file `jsdom` environment.

### Import flag graphics

Team flags are loaded from local image files whose filenames match each team's `flagCode`.

```bash
npm run import:flags -- /absolute/path/to/flag-files
```

Supported file types: `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`.

Examples:

- `EN.svg`
- `US.png`
- `AG.svg`

The importer copies the files into `public/flags/` and regenerates the app manifest so flags can render inline beside team names.

### Tournament run tooling

For test runs and the real pool, the app now has CLI helpers to reset run state and load different fixture schedules, result sets, and trivia sets.

Reset tournament state:

```bash
npm run reset:tournament
```

Keep existing users or trivia questions if you want:

```bash
npm run reset:tournament -- --keep-users --keep-trivia
```

Export the current fixture structure:

```bash
npm run fixtures:export -- --output data/my-fixtures.json
```

Load fixtures from a file using their real kickoff times:

```bash
npm run fixtures:load -- --input data/my-fixtures.json --mode preserve
```

Load the same fixture structure on a compressed test schedule:

```bash
npm run fixtures:load -- --input data/my-fixtures.json --mode compressed --start 2026-05-01T09:00:00Z --interval-minutes 5 --stage-gap-minutes 30
```

Load a dummy result set:

```bash
npm run results:load -- --input data/my-results.json
```

Load and optionally activate a trivia set:

```bash
npm run trivia:load -- --input data/my-trivia.json --set TEST --start-on 2026-05-01
```

Bootstrap the current remote-friendly `test_1` pack in one command after migrations:

```bash
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require" npm run bootstrap:remote-test
```

Example file shapes live in [data/examples/fixtures.example.json](/Users/bradjones/Documents/current work/apr26/wc codex/data/examples/fixtures.example.json), [data/examples/results.example.json](/Users/bradjones/Documents/current work/apr26/wc codex/data/examples/results.example.json), and [data/examples/trivia.example.json](/Users/bradjones/Documents/current work/apr26/wc codex/data/examples/trivia.example.json).

### Admin access

- Local browser bootstrap login: `Admin` / `admin12345`
- Local regular-user bootstrap login: `Test User` / `user12345`
- Remote test bootstrap uses the same credentials
