import { UserRole, type MatchStage, MatchStatus } from "@prisma/client";
import { closeDb, prisma } from "./lib/db";
import { getArg } from "./lib/cli";
import { readJsonFile, type FixtureFileRow, type TriviaFileRow } from "./lib/tournament-files";
import { autoWireKnockoutBracketScript, shiftTriviaDateKey } from "./lib/tournament-ops";
import { randomBytes, createHash, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { DEFAULT_TEAMS } from "./lib/default-teams";

const scryptAsync = promisify(scrypt);

const ADMIN_NAME = "Admin";
const ADMIN_PASSWORD = "admin12345";
const DEFAULT_USERS_PATH = "data/test_3/users.json";
const DEFAULT_FIXTURES_PATH = "data/test_1/real-fixtures.scaffold.json";
const DEFAULT_TRIVIA_PATH = "data/test_1/trivia.example.json";
const DEFAULT_TRIVIA_SET = "TEST";
const DEFAULT_START_AT = "2026-05-07T12:15:00Z";
const DEFAULT_SIMULATION_SEED = "20260507";

type UserFileRow = {
  name: string;
  password?: string;
  simulated?: boolean;
};

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

function hashSeed(input: string) {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seedInput: string) {
  const seedFactory = hashSeed(seedInput);
  return mulberry32(seedFactory());
}

function shuffled<T>(values: T[], seed: string) {
  const output = [...values];
  const rng = createRng(seed);
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
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
  const usersPath = getArg("users") ?? DEFAULT_USERS_PATH;
  const fixturesPath = getArg("fixtures") ?? DEFAULT_FIXTURES_PATH;
  const triviaPath = getArg("trivia") ?? DEFAULT_TRIVIA_PATH;
  const startIso = getArg("start") ?? DEFAULT_START_AT;
  const intervalMinutes = Number(getArg("interval-minutes") ?? "5");
  const stageGapMinutes = Number(getArg("stage-gap-minutes") ?? "0");
  const triviaSet = (getArg("set") ?? DEFAULT_TRIVIA_SET).trim().toUpperCase();
  const triviaStartOn = getArg("trivia-start-on") ?? "2026-05-07";
  const simulationSeed = getArg("seed") ?? DEFAULT_SIMULATION_SEED;

  const [users, fixtures, triviaRows, adminPasswordHash] = await Promise.all([
    readJsonFile<UserFileRow[]>(usersPath),
    readJsonFile<FixtureFileRow[]>(fixturesPath),
    readJsonFile<TriviaFileRow[]>(triviaPath),
    hashPassword(ADMIN_PASSWORD),
  ]);

  if (users.length === 0) throw new Error("User file is empty");
  if (fixtures.length === 0) throw new Error("Fixture file is empty");
  if (triviaRows.length === 0) throw new Error("Trivia file is empty");
  if (users.length !== 16) throw new Error(`Expected 16 players, found ${users.length}`);

  const normalizedUsers = users.map((user) => ({
    name: user.name.trim(),
    password: user.password?.trim() || null,
    simulated: user.simulated ?? !user.password,
  }));

  for (const user of normalizedUsers) {
    if (!user.name) throw new Error("Every player needs a name");
    if (!user.simulated && !user.password) {
      throw new Error(`Real player ${user.name} requires a password`);
    }
    if (user.simulated && user.password) {
      throw new Error(`Simulated player ${user.name} should not have a password`);
    }
  }

  const userPasswordHashes = await Promise.all(
    normalizedUsers.map(async (user) => (user.password ? hashPassword(user.password) : null)),
  );

  const kickoffs = buildCompressedKickoffs(fixtures, startIso, intervalMinutes, stageGapMinutes);
  const triviaQuestions = triviaRows.map((row, index) => ({
    triviaSet,
    publishOn: shiftTriviaDateKey(triviaStartOn, index),
    prompt: row.prompt,
    optionA: row.optionA,
    optionB: row.optionB,
    optionC: row.optionC,
    optionD: row.optionD,
    correctOption: row.correctOption,
  }));

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
      update: {
        activeTriviaSet: triviaSet,
        simulationEnabled: true,
        simulationSeed,
      },
      create: {
        id: 1,
        activeTriviaSet: triviaSet,
        simulationEnabled: true,
        simulationSeed,
      },
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

    for (const team of DEFAULT_TEAMS) {
      await tx.team.upsert({
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

    const teamRows = await tx.team.findMany({
      select: { id: true, name: true },
      take: 500,
    });
    const teamIdByName = new Map(teamRows.map((team) => [team.name, team.id]));

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

    for (const [index, user] of normalizedUsers.entries()) {
      await tx.user.create({
        data: {
          name: user.name,
          role: UserRole.USER,
          passwordHash: userPasswordHashes[index],
        },
      });
    }

    const allUsers = await tx.user.findMany({ select: { id: true, name: true } });
    await tx.userScore.createMany({
      data: allUsers.map((user) => ({ userId: user.id })),
      skipDuplicates: true,
    });

    await tx.triviaQuestion.createMany({ data: triviaQuestions });

    const assignmentUsers = allUsers
      .filter((user) => user.name !== ADMIN_NAME)
      .sort((a, b) => a.name.localeCompare(b.name));
    const shuffledTeams = shuffled(teamRows, `${simulationSeed}:teams`);
    const teamsPerUser = Math.floor(shuffledTeams.length / assignmentUsers.length);
    if (teamsPerUser * assignmentUsers.length !== shuffledTeams.length) {
      throw new Error("Teams cannot be evenly distributed across players");
    }

    const teamAssignments = assignmentUsers.flatMap((user, userIndex) =>
      shuffledTeams
        .slice(userIndex * teamsPerUser, userIndex * teamsPerUser + teamsPerUser)
        .map((team) => ({
          userId: user.id,
          teamId: team.id,
        })),
    );
    await tx.userTeam.createMany({ data: teamAssignments });

    const matchesToCreate = fixtures.map((fixture) => {
      const kickoffAt = kickoffs.get(fixture);
      if (!kickoffAt || Number.isNaN(kickoffAt.getTime())) {
        throw new Error(`Fixture is missing a valid kickoffAt for stage ${fixture.stage}`);
      }

      const homeTeamId = fixture.homeTeamName ? teamIdByName.get(fixture.homeTeamName) ?? null : null;
      const awayTeamId = fixture.awayTeamName ? teamIdByName.get(fixture.awayTeamName) ?? null : null;

      if (fixture.homeTeamName && !homeTeamId) {
        throw new Error(`Unknown home team: ${fixture.homeTeamName}`);
      }
      if (fixture.awayTeamName && !awayTeamId) {
        throw new Error(`Unknown away team: ${fixture.awayTeamName}`);
      }

      return {
        stage: fixture.stage,
        groupCode: fixture.groupCode ?? null,
        bracketOrder: fixture.bracketOrder ?? null,
        kickoffAt,
        simulationApplyAt: kickoffAt,
        simulationHomeScore: null,
        simulationAwayScore: null,
        simulationHomePenalties: null,
        simulationAwayPenalties: null,
        status: MatchStatus.SCHEDULED,
        homeTeamId,
        awayTeamId,
        homeScore: null,
        awayScore: null,
        homePenalties: null,
        awayPenalties: null,
      };
    });

    await tx.match.createMany({ data: matchesToCreate });
  }, {
    timeout: 60000,
    maxWait: 10000,
  });

  await autoWireKnockoutBracketScript();

  console.log("Remote simulated test bootstrap complete.");
  console.log(`Fixtures loaded: ${fixtures.length}`);
  console.log(`Trivia loaded into ${triviaSet}: ${triviaRows.length}`);
  console.log(`Simulation seed: ${simulationSeed}`);
  console.log(`Admin login: ${ADMIN_NAME} / ${ADMIN_PASSWORD}`);
  for (const user of normalizedUsers) {
    if (user.password) {
      console.log(`Real player login: ${user.name} / ${user.password}`);
    } else {
      console.log(`Simulated player: ${user.name}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
