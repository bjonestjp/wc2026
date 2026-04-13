# Online Test Instance Setup

Deploy a publicly accessible test instance using **Vercel** (hosting) + **Neon** (hosted Postgres). Both have free tiers that are more than enough for testing.

---

## Step 1 — Set up the database (Neon)

1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Create a new project (e.g. `wc2026-test`).
3. It will give you a connection string like:

```
postgresql://user:pass@ep-xyz-123.eu-west-1.aws.neon.tech/neondb?sslmode=require
```

4. Copy that connection string — you'll need it in the next step.

---

## Step 2 — Push to GitHub

If your project isn't already on GitHub:

```bash
git remote add origin https://github.com/YOUR_USERNAME/wc2026-pool.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Add New Project"** → import your repo.
3. In the **Environment Variables** section, add:

| Name           | Value                                      |
| -------------- | ------------------------------------------ |
| `DATABASE_URL` | *(paste the Neon connection string from Step 1)* |

4. Click **Deploy** — Vercel auto-detects Next.js and builds it.

---

## Step 4 — Run migrations on the hosted database

After the first deploy, you need to create the tables in Neon. From your local machine, run these commands with your Neon connection string:

```bash
# Run migrations against the remote database
DATABASE_URL="postgresql://user:pass@ep-xyz-123.neon.tech/neondb?sslmode=require" npx prisma migrate deploy

# Seed the database (creates admin user + prints a one-time invite code)
DATABASE_URL="postgresql://user:pass@ep-xyz-123.neon.tech/neondb?sslmode=require" npx prisma db seed
```

Copy the dev invite code that gets printed to the terminal.

---

## Step 5 — First login

1. Vercel gives you a URL like `https://wc2026-pool.vercel.app`.
2. Go to `https://your-app.vercel.app/login`.
3. Enter the dev invite code from Step 4 + a display name.
4. To make yourself an admin, you can either:
   - Connect to the Neon database via Prisma Studio and change your user's `role` to `ADMIN`:
     ```bash
     DATABASE_URL="postgresql://user:pass@ep-xyz-123.neon.tech/neondb?sslmode=require" npx prisma studio
     ```
   - Or use the Neon SQL Editor in their web dashboard.

---

## Step 6 — Share with testers

Share the Vercel URL with anyone you want to test with. They can access it from any device on any network — phone, laptop, etc.

Create invite codes for each tester via `/admin/invites` once you're logged in as admin.

---

## Notes

- **Vercel free tier**: 100GB bandwidth, serverless functions — plenty for testing.
- **Neon free tier**: 0.5GB storage + 190 compute hours/month — plenty for a pool.
- Every `git push` to `main` **auto-deploys** to Vercel.
- You can add a **custom domain** later in Vercel project settings.
- To redeploy after code changes, just push to GitHub:
  ```bash
  git add .
  git commit -m "your changes"
  git push
  ```
