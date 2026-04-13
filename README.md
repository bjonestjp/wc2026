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

### Admin access

- Seed prints a one-time dev invite code in the terminal.
- After claiming an account, make that user an admin in the database (or adjust seeding for your environment).
