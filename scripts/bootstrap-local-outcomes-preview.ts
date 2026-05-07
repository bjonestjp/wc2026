import "dotenv/config";

import { PrismaClient, MatchStage, MatchStatus, PickSelection, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { DEFAULT_TEAMS } from "./lib/default-teams";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const scryptAsync = promisify(scrypt);

const ADMIN_NAME = "Admin";
const ADMIN_PASSWORD = "admin12345";
const PREVIEW_USER_NAME = "Preview User";
const PREVIEW_USER_PASSWORD = "preview12345";

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return `s:${salt}:${buffer.toString("hex")}`;
}

type PreviewMatchSeed = {
  homeTeamName: string;
  awayTeamName: string;
  kickoffOffsetMinutes: number;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  userPick?: PickSelection;
};

const previewMatchSeeds: PreviewMatchSeed[] = [
  {
    homeTeamName: "Mexico",
    awayTeamName: "Japan",
    kickoffOffsetMinutes: -180,
    status: MatchStatus.FINAL,
    homeScore: 2,
    awayScore: 1,
    userPick: PickSelection.HOME,
  },
  {
    homeTeamName: "Brazil",
    awayTeamName: "Morocco",
    kickoffOffsetMinutes: -135,
    status: MatchStatus.FINAL,
    homeScore: 0,
    awayScore: 1,
    userPick: PickSelection.HOME,
  },
  {
    homeTeamName: "England",
    awayTeamName: "Canada",
    kickoffOffsetMinutes: -90,
    status: MatchStatus.FINAL,
    homeScore: 1,
    awayScore: 1,
    userPick: PickSelection.DRAW,
  },
  {
    homeTeamName: "Mexico",
    awayTeamName: "South Korea",
    kickoffOffsetMinutes: 45,
    status: MatchStatus.SCHEDULED,
  },
  {
    homeTeamName: "Brazil",
    awayTeamName: "Senegal",
    kickoffOffsetMinutes: 90,
    status: MatchStatus.SCHEDULED,
    userPick: PickSelection.AWAY,
  },
];

async function upsertUser(params: {
  name: string;
  password: string;
  role: UserRole;
}) {
  const passwordHash = await hashPassword(params.password);
  const user = await prisma.user.upsert({
    where: { name: params.name },
    update: { passwordHash, role: params.role },
    create: { name: params.name, passwordHash, role: params.role },
  });

  await prisma.userScore.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return user;
}

async function ensureTeams() {
  for (const team of DEFAULT_TEAMS) {
    await prisma.team.upsert({
      where: { name: team.name },
      update: { groupCode: team.groupCode, flagCode: team.flagCode },
      create: {
        name: team.name,
        groupCode: team.groupCode,
        flagCode: team.flagCode,
      },
    });
  }
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

  await prisma.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, activeTriviaSet: "TEST" },
  });

  await ensureTeams();

  const [admin, previewUser] = await Promise.all([
    upsertUser({ name: ADMIN_NAME, password: ADMIN_PASSWORD, role: UserRole.ADMIN }),
    upsertUser({ name: PREVIEW_USER_NAME, password: PREVIEW_USER_PASSWORD, role: UserRole.USER }),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({});
    await tx.inviteCode.deleteMany({});
    await tx.triviaAnswer.deleteMany({});
    await tx.scoreEvent.deleteMany({});
    await tx.pick.deleteMany({});
    await tx.userTeam.deleteMany({});
    await tx.matchAdvancement.deleteMany({});
    await tx.match.deleteMany({});

    const assignedTeams = await tx.team.findMany({
      where: { name: { in: ["Mexico", "Brazil", "England"] } },
      orderBy: { name: "asc" },
    });

    for (const team of assignedTeams) {
      await tx.userTeam.create({
        data: { userId: previewUser.id, teamId: team.id },
      });
    }

    const teamByName = new Map(
      (
        await tx.team.findMany({
          where: {
            name: {
              in: Array.from(
                new Set(previewMatchSeeds.flatMap((match) => [match.homeTeamName, match.awayTeamName])),
              ),
            },
          },
        })
      ).map((team) => [team.name, team]),
    );

    const now = Date.now();
    let correctCount = 0;

    for (const seed of previewMatchSeeds) {
      const homeTeam = teamByName.get(seed.homeTeamName);
      const awayTeam = teamByName.get(seed.awayTeamName);
      if (!homeTeam || !awayTeam) {
        throw new Error(`Missing team for preview seed: ${seed.homeTeamName} vs ${seed.awayTeamName}`);
      }

      const match = await tx.match.create({
        data: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoffAt: new Date(now + seed.kickoffOffsetMinutes * 60 * 1000),
          stage: MatchStage.GROUP,
          groupCode: homeTeam.groupCode ?? awayTeam.groupCode ?? "A",
          status: seed.status,
          homeScore: seed.homeScore ?? null,
          awayScore: seed.awayScore ?? null,
        },
      });

      if (seed.userPick) {
        await tx.pick.create({
          data: {
            userId: previewUser.id,
            matchId: match.id,
            selection: seed.userPick,
          },
        });
      }

      if (
        seed.status === MatchStatus.FINAL &&
        seed.userPick &&
        seed.homeScore != null &&
        seed.awayScore != null
      ) {
        const actualSelection =
          seed.homeScore > seed.awayScore
            ? PickSelection.HOME
            : seed.homeScore < seed.awayScore
              ? PickSelection.AWAY
              : PickSelection.DRAW;

        if (actualSelection === seed.userPick) correctCount += 1;
      }
    }

    await tx.userScore.update({
      where: { userId: previewUser.id },
      data: {
        pointsTotal: correctCount * 3,
        currentStreak: 0,
        maxStreak: correctCount,
      },
    });

    await tx.userScore.update({
      where: { userId: admin.id },
      data: {
        pointsTotal: 0,
        currentStreak: 0,
        maxStreak: 0,
      },
    });
  });

  console.log("Local recent outcomes preview is ready.");
  console.log("");
  console.log("Admin login");
  console.log(`  name: ${ADMIN_NAME}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log("");
  console.log("Preview player login");
  console.log(`  name: ${PREVIEW_USER_NAME}`);
  console.log(`  password: ${PREVIEW_USER_PASSWORD}`);
  console.log("");
  console.log("Assigned teams:");
  console.log("  Mexico, Brazil, England");
  console.log("");
  console.log(`Generated ${previewMatchSeeds.length} dummy fixtures.`);
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
