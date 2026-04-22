# Online Test Instance Setup

Deploy a publicly accessible test instance using **Vercel Hobby** for hosting and a free hosted Postgres database from **Neon** or **Supabase**. This is the cleanest way to test from multiple devices without depending on your laptop staying online.

---

## Step 1 — Create a free hosted Postgres database

1. Create a free account with either [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Create a new project, for example `wc2026-test`.
3. Copy the Postgres connection string. It should look roughly like:

```text
postgresql://user:pass@host:5432/dbname?sslmode=require
```

You will use that same connection string both in Vercel and in a local bootstrap command.

---

## Step 2 — Push the repo to GitHub

If the project is not already on GitHub:

```bash
git remote add origin https://github.com/YOUR_USERNAME/wc2026-pool.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel Hobby

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** and import this repo.
3. In **Environment Variables**, add:

| Name           | Value                                  |
| -------------- | -------------------------------------- |
| `DATABASE_URL` | your hosted Postgres connection string |

4. Click **Deploy**.

Vercel will detect Next.js automatically.

---

## Step 4 — Bootstrap the hosted database for the current test

From your local machine, run these commands against the hosted database:

```bash
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require" npx prisma migrate deploy
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require" npm run bootstrap:remote-test
```

`bootstrap:remote-test` will:
- create or refresh the admin login
- create a regular test user
- clear old tournament state
- load the current `test_1` fixture scaffold on the compressed schedule
- load the `TEST` trivia set
- print an invite code for signup testing

Default credentials created by the bootstrap:
- `Admin` / `admin12345`
- `Test User` / `user12345`

Optional overrides:

```bash
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require" npm run bootstrap:remote-test -- \
  --start 2026-04-25T13:00:00Z \
  --interval-minutes 5 \
  --stage-gap-minutes 30 \
  --fixtures data/test_1/real-fixtures.scaffold.json \
  --trivia data/test_1/trivia.example.json \
  --trivia-start-on 2026-04-25
```

---

## Step 5 — Sign in and check the test data

1. Open the Vercel deployment URL.
2. Go to `/login`.
3. Sign in as `Admin`.
4. Check:
   - `/admin`
   - `/admin/users`
   - `/fixtures`
   - `/leaderboard`
   - the home page trivia card

If you want more test accounts, create invite codes from `/admin/invites`.

---

## Notes

- **Vercel Hobby** is free and fine for a lightweight test pool.
- **Neon** and **Supabase** both offer free hosted Postgres tiers suitable for testing.
- Every push to the connected GitHub branch auto-deploys to Vercel.
- If you want to rerun the same hosted test later, rerun `prisma migrate deploy` and `npm run bootstrap:remote-test` against the same hosted database.

---

## Alternative: Fast temporary share link

If you ever want a zero-setup temporary test instead, you can tunnel the local app:

```bash
npx --yes cloudflared tunnel --url http://localhost:3000
```

That gives you a temporary public URL for the current local instance, but it stops working when the tunnel process stops.
