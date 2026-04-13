# Local Development Setup

## Prerequisites

- Node.js + npm
- PostgreSQL running locally

## Steps

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` to point at your local Postgres:

```
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/wc2026?schema=public"
```

Drop the `&sslmode=verify-full` part for local — that's only needed for hosted/production Postgres.

### 3. Create the database (if it doesn't exist)

```bash
createdb wc2026
```

### 4. Run migrations

```bash
npx prisma migrate dev
```

### 5. Seed the database

```bash
npx prisma db seed
```

This creates an Admin user and prints a **one-time dev invite code** to the terminal (looks like `DEV-a1b2c3d4e5f6g7h8`). Copy it — you'll need it to log in.

### 6. Start the dev server

```bash
npm run dev
```

Open **http://localhost:3000**.

### 7. First login

- Go to `/login`, enter the dev invite code from step 5 + a display name.
- The seed also creates an `Admin` user. To make your new account an admin, use Prisma Studio:

```bash
npx prisma studio
```

This opens a DB GUI at `localhost:5555`. Find your user in the `User` table and change `role` to `ADMIN`.

---

## Installing PostgreSQL on Mac

### Via Homebrew

```bash
brew install postgresql@17
brew services start postgresql@17
createdb wc2026
```

### Via Docker

```bash
docker run -d --name wc-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=wc2026 -p 5432:5432 postgres:17
```

Then set your `DATABASE_URL` to:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wc2026?schema=public"
```
