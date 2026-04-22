import { UserRole, type MatchStage, MatchStatus } from "@prisma/client";
import { closeDb, prisma } from "./lib/db";
import { getArg } from "./lib/cli";
import { readJsonFile, type FixtureFileRow, type TriviaFileRow } from "./lib/tournament-files";
import { autoWireKnockoutBracketScript, shiftTriviaDateKey } from "./lib/tournament-ops";
import { randomBytes, createHash, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const ADMIN_NAME = "Admin";
const ADMIN_PASSWORD = "admin12345";
const USER_NAME = "Test User";
const USER_PASSWORD = "user12345";
const DEFAULT_FIXTURES_PATH = "data/test_1/real-fixtures.scaffold.json";
const DEFAULT_TRIVIA_PATH = "data/test_1/trivia.example.json";
const DEFAULT_TRIVIA_SET = "TEST";
const DEFAULT_START_AT = "2026-04-22T12:00:00Z";

const STAGE_SORT_ORDER: Record<MatchStage, number> = {
  GROUP: 1,
  R32: 2,
  R16: 3,
  QF: 4,
  SF: 5,
  THIRD_PLACE: 6,
  FINAL: 7,
};

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return `s:${salt}:${buffer.toString("hex")}`;
}

function buildCompressedKickoffs(
  fixtures: FixtureFileRow[],
  startIso: string,
  intervalMinutes: number,
  stageGapMinutes: number,
) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid --start date");
  }

  const sorted = [...fixtures].sort((a, b) => {
    const stageDiff = STAGE_SORT_ORDER[a.stage] - STAGE_SORT_ORDER[b.stage];
    if (stageDiff !== 0) return stageDiff;
    const orderA = a.bracketOrder ?? 0;
    const orderB = b.bracketOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.groupCode ?? "").localeCompare(b.groupCode ?? "");
  });

  const kickoffs = new Map<FixtureFileRow, Date>();
  let current = new Date(start);
  let previousStage: MatchStage | null = null;

  for (const fixture of sorted) {
    if (previousStage && previousStage !== fixture.stage) {
      current = new Date(current.getTime() + stageGapMinutes * 60_000);
    }
    kickoffs.set(fixture, new Date(current));
    current = new Date(current.getTime() + intervalMinutes * 60_000);
    previousStage = fixture.stage;
  }

  return kickoffs;
}

async function main() {
  const fixturesPath = getArg("fixtures") ?? DEFAULT_FIXTURES_PATH;
  const triviaPath = getArg("trivia") ?? DEFAULT_TRIVIA_PATH;
  const startIso = getArg("start") ?? DEFAULT_START_AT;
  const intervalMinutes = Number(getArg("interval-minutes") ?? "5");
  const stageGapMinutes = Number(getArg("stage-gap-minutes") ?? "30");
  const triviaSet = (getArg("set") ?? DEFAULT_TRIVIA_SET).trim().toUpperCase();
  const triviaStartOn = getArg("trivia-start-on") ?? "2026-04-22";

  const [fixtures, triviaRows, teamRows, adminPasswordHash, userPasswordHash] =
    await Promise.all([
      readJsonFile<FixtureFileRow[]>(fixturesPath),
      readJsonFile<TriviaFileRow[]>(triviaPath),
      prisma.team.findMany({ select: { id: true, name: true }, take: 500 }),
      hashPassword(ADMIN_PASSWORD),
      hashPassword(USER_PASSWORD),
    ]);

  if (fixtures.length === 0) throw new Error("Fixture file is empty");
  if (triviaRows.length === 0) throw new Error("Trivia file is empty");

  const teamIdByName = new Map(teamRows.map((team) => [team.name, team.id]));
  const kickoffs = buildCompressedKickoffs(
    fixtures,
    startIso,
    intervalMinutes,
    stageGapMinutes,
  );
  const inviteCode = `DEV-${randomBytes(8).toString("hex")}`;

  await prisma.$transaction(async (tx) => {
    await tx.scoringConfig.upsert({
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

    await tx.appConfig.upsert({
      where: { id: 1 },
      update: { activeTriviaSet: triviaSet },
      create: { id: 1, activeTriviaSet: triviaSet },
    });

    await tx.session.deleteMany({});
    await tx.inviteCode.deleteMany({});
    await tx.triviaAnswer.deleteMany({});
    await tx.triviaQuestion.deleteMany({ where: { triviaSet } });
    await tx.userTeam.deleteMany({});
    await tx.pick.deleteMany({});
    await tx.scoreEvent.deleteMany({});
    await tx.userScore.deleteMany({});
    await tx.matchAdvancement.deleteMany({});
    await tx.match.deleteMany({});
    await tx.user.deleteMany({ where: { role: UserRole.USER } });

    await tx.user.upsert({
      where: { name: ADMIN_NAME },
      update: {
        role: UserRole.ADMIN,
        passwordHash: adminPasswordHash,
      },
      create: {
        name: ADMIN_NAME,
        role: UserRole.ADMIN,
        passwordHash: adminPasswordHash,
      },
    });

    await tx.user.upsert({
      where: { name: USER_NAME },
      update: {
        role: UserRole.USER,
        passwordHash: userPasswordHash,
      },
      create: {
        name: USER_NAME,
        role: UserRole.USER,
        passwordHash: userPasswordHash,
      },
    });

    const allUsers = await tx.user.findMany({
      select: { id: true },
    });

    await tx.userScore.createMany({
      data: allUsers.map((user) => ({ userId: user.id })),
      skipDuplicates: true,
    });

    await tx.inviteCode.create({
      data: {
        tokenHash: sha256Hex(inviteCode),
        label: "Remote test invite",
      },
    });

    for (const [index, row] of triviaRows.entries()) {
      await tx.triviaQuestion.create({
        data: {
          triviaSet,
          publishOn: shiftTriviaDateKey(triviaStartOn, index),
          prompt: row.prompt,
          optionA: row.optionA,
          optionB: row.optionB,
          optionC: row.optionC,
          optionD: row.optionD,
          correctOption: row.correctOption,
        },
      });
    }

    for (const fixture of fixtures) {
      const kickoffAt = kickoffs.get(fixture);
      if (!kickoffAt || Number.isNaN(kickoffAt.getTime())) {
        throw new Error(`Fixture is missing a valid kickoffAt for stage ${fixture.stage}`);
      }

      const homeTeamId = fixture.homeTeamName
        ? teamIdByName.get(fixture.homeTeamName) ?? null
        : null;
      const awayTeamId = fixture.awayTeamName
        ? teamIdByName.get(fixture.awayTeamName) ?? null
        : null;

      if (fixture.homeTeamName && !homeTeamId) {
        throw new Error(`Unknown home team: ${fixture.homeTeamName}`);
      }
      if (fixture.awayTeamName && !awayTeamId) {
        throw new Error(`Unknown away team: ${fixture.awayTeamName}`);
      }

      await tx.match.create({
        data: {
          stage: fixture.stage,
          groupCode: fixture.groupCode ?? null,
          bracketOrder: fixture.bracketOrder ?? null,
          kickoffAt,
          status: MatchStatus.SCHEDULED,
          homeTeamId,
          awayTeamId,
          homeScore: null,
          awayScore: null,
          homePenalties: null,
          awayPenalties: null,
        },
      });
    }
  });

  await autoWireKnockoutBracketScript();

  console.log("Remote test bootstrap complete.");
  console.log(`Fixtures loaded: ${fixtures.length}`);
  console.log(`Trivia loaded into ${triviaSet}: ${triviaRows.length}`);
  console.log(`Admin login: ${ADMIN_NAME} / ${ADMIN_PASSWORD}`);
  console.log(`Regular user login: ${USER_NAME} / ${USER_PASSWORD}`);
  console.log(`Invite code: ${inviteCode}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
