import "dotenv/config";

import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createHash, randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const scryptAsync = promisify(scrypt);

const ADMIN_NAME = "Admin";
const ADMIN_PASSWORD = "admin12345";
const USER_NAME = "Test User";
const USER_PASSWORD = "user12345";

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return `s:${salt}:${buffer.toString("hex")}`;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function upsertUser(params: {
  name: string;
  password: string;
  role: UserRole;
}) {
  const passwordHash = await hashPassword(params.password);

  const user = await prisma.user.upsert({
    where: { name: params.name },
    update: {
      role: params.role,
      passwordHash,
    },
    create: {
      name: params.name,
      role: params.role,
      passwordHash,
    },
  });

  await prisma.userScore.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return user;
}

async function main() {
  await prisma.scoringConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      pointsPerCorrect: 3,
      streakBonusStartAt: 3,
      streakBonusPoints: 1,
      missedPickBreaksStreak: false,
    },
  });

  const [admin, regularUser] = await Promise.all([
    upsertUser({
      name: ADMIN_NAME,
      password: ADMIN_PASSWORD,
      role: UserRole.ADMIN,
    }),
    upsertUser({
      name: USER_NAME,
      password: USER_PASSWORD,
      role: UserRole.USER,
    }),
  ]);

  const inviteCode = `DEV-${randomBytes(8).toString("hex")}`;
  await prisma.inviteCode.create({
    data: {
      tokenHash: sha256Hex(inviteCode),
      label: "Local browser test invite",
    },
  });

  console.log("Local browser test environment is ready.");
  console.log("");
  console.log("Admin login");
  console.log(`  name: ${ADMIN_NAME}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log(`  userId: ${admin.id}`);
  console.log("");
  console.log("Regular user login");
  console.log(`  name: ${USER_NAME}`);
  console.log(`  password: ${USER_PASSWORD}`);
  console.log(`  userId: ${regularUser.id}`);
  console.log("");
  console.log("Invite-code signup test");
  console.log(`  invite code: ${inviteCode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
