import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const USERS = [
  { name: "Admin", password: "admin12345" },
  { name: "user1", password: "user12345" },
  { name: "user2", password: "user22345" },
  { name: "user3", password: "user32345" },
  { name: "user4", password: "user42345" },
] as const;

async function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash || !storedHash.startsWith("s:")) return false;

  const [, salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const derivedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashBuffer = Buffer.from(hash, "hex");

  if (derivedBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedBuffer, hashBuffer);
}

async function main() {
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  try {
    for (const user of USERS) {
      const row = await prisma.user.findUnique({
        where: { name: user.name },
        select: {
          name: true,
          role: true,
          passwordHash: true,
        },
      });

      const ok = row
        ? await verifyPassword(user.password, row.passwordHash)
        : false;

      console.log(
        JSON.stringify({
          name: user.name,
          exists: Boolean(row),
          role: row?.role ?? null,
          hasPassword: Boolean(row?.passwordHash),
          passwordMatches: ok,
        }),
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
