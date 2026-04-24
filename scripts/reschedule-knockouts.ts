import { MatchStage } from "@prisma/client";
import { closeDb, prisma } from "./lib/db";
import { getArg, requireArg } from "./lib/cli";

const KNOCKOUT_STAGES: MatchStage[] = [
  MatchStage.R32,
  MatchStage.R16,
  MatchStage.QF,
  MatchStage.SF,
  MatchStage.THIRD_PLACE,
  MatchStage.FINAL,
];

const STAGE_SORT_ORDER: Record<MatchStage, number> = {
  GROUP: 1,
  R32: 2,
  R16: 3,
  QF: 4,
  SF: 5,
  THIRD_PLACE: 6,
  FINAL: 7,
};

async function main() {
  const startIso = requireArg("start");
  const intervalMinutes = Number(getArg("interval-minutes") ?? "1");
  const stageGapMinutes = Number(getArg("stage-gap-minutes") ?? "0");

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid --start date");
  }

  const matches = await prisma.match.findMany({
    where: {
      stage: { in: KNOCKOUT_STAGES },
    },
    orderBy: [{ stage: "asc" }, { bracketOrder: "asc" }, { kickoffAt: "asc" }],
    select: {
      id: true,
      stage: true,
      bracketOrder: true,
    },
    take: 200,
  });

  const sorted = [...matches].sort((a, b) => {
    const stageDiff = STAGE_SORT_ORDER[a.stage] - STAGE_SORT_ORDER[b.stage];
    if (stageDiff !== 0) return stageDiff;
    const orderA = a.bracketOrder ?? 0;
    const orderB = b.bracketOrder ?? 0;
    return orderA - orderB;
  });

  let current = new Date(start);
  let previousStage: MatchStage | null = null;

  await prisma.$transaction(async (tx) => {
    for (const match of sorted) {
      if (previousStage && previousStage !== match.stage) {
        current = new Date(current.getTime() + stageGapMinutes * 60_000);
      }

      await tx.match.update({
        where: { id: match.id },
        data: { kickoffAt: new Date(current) },
      });

      current = new Date(current.getTime() + intervalMinutes * 60_000);
      previousStage = match.stage;
    }
  });

  console.log(`Rescheduled ${sorted.length} knockout fixtures.`);
  console.log(`Start: ${start.toISOString()}`);
  console.log(`Interval minutes: ${intervalMinutes}`);
  console.log(`Stage gap minutes: ${stageGapMinutes}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
