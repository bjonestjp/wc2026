import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createHash, randomBytes } from "node:crypto";
import { DEFAULT_TEAMS } from "../scripts/lib/default-teams";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function main() {
  // Singleton scoring config
  await prisma.scoringConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      pointsPerCorrect: 3,
      streakBonusStartAt: 3,
      streakBonusPoints: 1,
      missedPickBreaksStreak: false,
    },
    update: {},
  });

  await prisma.appConfig.upsert({
    where: { id: 1 },
    create: { id: 1, activeTriviaSet: "REAL" },
    update: {},
  });

  for (const team of DEFAULT_TEAMS) {
    await prisma.team.upsert({
      where: { name: team.name },
      update: {
        groupCode: team.groupCode,
        flagCode: team.flagCode,
      },
      create: {
        name: team.name,
        groupCode: team.groupCode,
        flagCode: team.flagCode,
      },
    });
  }

  // Create an initial admin user + invite code for local/dev convenience.
  // You can delete/rotate these anytime in the admin UI later.
  const existingAdmin = await prisma.user.findFirst({
    where: { name: "Admin" },
  });
  const admin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: UserRole.ADMIN },
      })
    : await prisma.user.create({
        data: { name: "Admin", role: UserRole.ADMIN },
      });

  const rawCode = `DEV-${randomBytes(8).toString("hex")}`;
  await prisma.inviteCode.create({
    data: {
      tokenHash: sha256Hex(rawCode),
      label: "Dev bootstrap code",
    },
  });

  console.log("Seed complete.");
  console.log("Admin user:", admin.id);
  console.log("Dev invite code (one-time):", rawCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
