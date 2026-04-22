import { MatchStage, MatchStatus } from "@prisma/client";
import { closeDb, prisma } from "./lib/db";
import { getArg, requireArg } from "./lib/cli";
import { readJsonFile, type FixtureFileRow } from "./lib/tournament-files";
import { autoWireKnockoutBracketScript } from "./lib/tournament-ops";

const STAGE_SORT_ORDER: Record<MatchStage, number> = {
  GROUP: 1,
  R32: 2,
  R16: 3,
  QF: 4,
  SF: 5,
  THIRD_PLACE: 6,
  FINAL: 7,
};

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
  const inputPath = requireArg("input");
  const mode = (getArg("mode") ?? "preserve").toLowerCase();
  const fixtures = await readJsonFile<FixtureFileRow[]>(inputPath);

  if (mode !== "preserve" && mode !== "compressed") {
    throw new Error("--mode must be preserve or compressed");
  }

  const teamRows = await prisma.team.findMany({
    select: { id: true, name: true },
    take: 500,
  });
  const teamIdByName = new Map(teamRows.map((team) => [team.name, team.id]));

  const kickoffs =
    mode === "compressed"
      ? buildCompressedKickoffs(
          fixtures,
          requireArg("start"),
          Number(getArg("interval-minutes") ?? "5"),
          Number(getArg("stage-gap-minutes") ?? "30"),
        )
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.pick.deleteMany({});
    await tx.scoreEvent.deleteMany({});
    await tx.userScore.deleteMany({});
    await tx.matchAdvancement.deleteMany({});
    await tx.match.deleteMany({});

    for (const fixture of fixtures) {
      const kickoffAt =
        mode === "compressed"
          ? kickoffs?.get(fixture)
          : fixture.kickoffAt
            ? new Date(fixture.kickoffAt)
            : null;

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
  console.log(`Loaded ${fixtures.length} fixtures using ${mode} mode.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
