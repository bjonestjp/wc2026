import { UserRole, MatchStage, MatchStatus } from "@prisma/client";
import { closeDb, prisma } from "./lib/db";
import { requireArg } from "./lib/cli";
import { readJsonFile } from "./lib/tournament-files";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const ADMIN_NAME = "Admin";
const ADMIN_PASSWORD = "admin12345";

type UserFileRow = {
  name: string;
  password: string;
};

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return `s:${salt}:${buffer.toString("hex")}`;
}

async function main() {
  const usersPath = requireArg("users");
  const users = await readJsonFile<UserFileRow[]>(usersPath);
  if (users.length === 0) {
    throw new Error("User file is empty");
  }

  const seenNames = new Set<string>();
  for (const user of users) {
    const name = user.name.trim();
    if (!name) throw new Error("Every user must have a name");
    if (!user.password) throw new Error(`Missing password for ${name}`);
    if (name === ADMIN_NAME) {
      throw new Error(`Do not include ${ADMIN_NAME} in the user file; it is managed automatically`);
    }
    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      throw new Error(`Duplicate user name: ${name}`);
    }
    seenNames.add(key);
  }

  const adminPasswordHash = await hashPassword(ADMIN_PASSWORD);
  const userPasswordHashes = await Promise.all(users.map((user) => hashPassword(user.password)));

  await prisma.$transaction(async (tx) => {
    await tx.appConfig.upsert({
      where: { id: 1 },
      update: {
        simulationEnabled: false,
        simulationSeed: null,
      },
      create: {
        id: 1,
        activeTriviaSet: "REAL",
        simulationEnabled: false,
        simulationSeed: null,
      },
    });

    await tx.session.deleteMany({});
    await tx.inviteCode.deleteMany({});
    await tx.triviaAnswer.deleteMany({});
    await tx.userTeam.deleteMany({});
    await tx.pick.deleteMany({});
    await tx.scoreEvent.deleteMany({});
    await tx.userScore.deleteMany({});

    await tx.match.updateMany({
      where: {},
      data: {
        status: MatchStatus.SCHEDULED,
        homeScore: null,
        awayScore: null,
        homePenalties: null,
        awayPenalties: null,
        simulationApplyAt: null,
        simulationHomeScore: null,
        simulationAwayScore: null,
        simulationHomePenalties: null,
        simulationAwayPenalties: null,
      },
    });

    await tx.match.updateMany({
      where: { stage: { in: [MatchStage.R32, MatchStage.R16, MatchStage.QF, MatchStage.SF, MatchStage.THIRD_PLACE, MatchStage.FINAL] } },
      data: {
        homeTeamId: null,
        awayTeamId: null,
      },
    });

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

    for (const [index, user] of users.entries()) {
      await tx.user.create({
        data: {
          name: user.name.trim(),
          role: UserRole.USER,
          passwordHash: userPasswordHashes[index],
        },
      });
    }

    const allUsers = await tx.user.findMany({
      select: { id: true },
    });

    await tx.userScore.createMany({
      data: allUsers.map((user) => ({
        userId: user.id,
        pointsTotal: 0,
        currentStreak: 0,
        maxStreak: 0,
      })),
      skipDuplicates: true,
    });
  }, {
    timeout: 60000,
    maxWait: 10000,
  });

  console.log("Prepared clean tournament state for a new test.");
  console.log(`Admin login: ${ADMIN_NAME} / ${ADMIN_PASSWORD}`);
  for (const user of users) {
    console.log(`Test user login: ${user.name} / ${user.password}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
