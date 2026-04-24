import { MatchStage } from "@prisma/client";
import { closeDb, prisma } from "./lib/db";
import { getArg, requireArg } from "./lib/cli";

const GROUP_BLOCKS = [
  ["A", "B", "C", "D"],
  ["E", "F", "G", "H"],
  ["I", "J", "K", "L"],
] as const;

const KNOCKOUT_STAGE_BLOCKS: MatchStage[][] = [
  [MatchStage.R32],
  [MatchStage.R16],
  [MatchStage.QF],
  [MatchStage.SF],
  [MatchStage.THIRD_PLACE, MatchStage.FINAL],
] as const;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main() {
  const startIso = requireArg("start");
  const intervalMinutes = Number(getArg("interval-minutes") ?? "15");
  const knockoutBreakMinutes = Number(getArg("knockout-break-minutes") ?? "30");

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid --start date");
  }

  const groupMatches = await prisma.match.findMany({
    where: { stage: MatchStage.GROUP },
    orderBy: [{ groupCode: "asc" }, { kickoffAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      groupCode: true,
    },
    take: 200,
  });

  const matchesByGroup = new Map<string, string[]>();
  for (const match of groupMatches) {
    const groupCode = match.groupCode ?? "";
    if (!groupCode) continue;
    const ids = matchesByGroup.get(groupCode) ?? [];
    ids.push(match.id);
    matchesByGroup.set(groupCode, ids);
  }

  for (const block of GROUP_BLOCKS) {
    for (const groupCode of block) {
      const ids = matchesByGroup.get(groupCode) ?? [];
      if (ids.length !== 6) {
        throw new Error(`Expected 6 group matches for Group ${groupCode}, found ${ids.length}`);
      }
    }
  }

  const knockoutMatches = await prisma.match.findMany({
    where: {
      stage: {
        in: [
          MatchStage.R32,
          MatchStage.R16,
          MatchStage.QF,
          MatchStage.SF,
          MatchStage.THIRD_PLACE,
          MatchStage.FINAL,
        ],
      },
    },
    orderBy: [{ stage: "asc" }, { bracketOrder: "asc" }, { kickoffAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      stage: true,
    },
    take: 200,
  });

  const knockoutIdsByStage = new Map<MatchStage, string[]>();
  for (const match of knockoutMatches) {
    const ids = knockoutIdsByStage.get(match.stage) ?? [];
    ids.push(match.id);
    knockoutIdsByStage.set(match.stage, ids);
  }

  await prisma.$transaction(async (tx) => {
    for (let cycleIndex = 0; cycleIndex < 3; cycleIndex += 1) {
      for (let blockIndex = 0; blockIndex < GROUP_BLOCKS.length; blockIndex += 1) {
        const kickoffAt = addMinutes(start, (cycleIndex * GROUP_BLOCKS.length + blockIndex) * intervalMinutes);
        const groupCodes = GROUP_BLOCKS[blockIndex];

        for (const groupCode of groupCodes) {
          const ids = matchesByGroup.get(groupCode) ?? [];
          const slice = ids.slice(cycleIndex * 2, cycleIndex * 2 + 2);
          for (const matchId of slice) {
            await tx.match.update({
              where: { id: matchId },
              data: { kickoffAt },
            });
          }
        }
      }
    }

    const firstKnockoutKickoff = addMinutes(
      start,
      (3 * GROUP_BLOCKS.length - 1) * intervalMinutes + knockoutBreakMinutes,
    );

    for (let blockIndex = 0; blockIndex < KNOCKOUT_STAGE_BLOCKS.length; blockIndex += 1) {
      const kickoffAt = addMinutes(firstKnockoutKickoff, blockIndex * intervalMinutes);
      const stages = KNOCKOUT_STAGE_BLOCKS[blockIndex];

      for (const stage of stages) {
        const ids = knockoutIdsByStage.get(stage) ?? [];
        for (const matchId of ids) {
          await tx.match.update({
            where: { id: matchId },
            data: { kickoffAt },
          });
        }
      }
    }
  }, {
    timeout: 60000,
    maxWait: 10000,
  });

  console.log("Rescheduled tournament by matchday blocks.");
  console.log(`Start: ${start.toISOString()}`);
  console.log(`Interval minutes: ${intervalMinutes}`);
  console.log(`Knockout break minutes: ${knockoutBreakMinutes}`);
  console.log("Group matchdays:");
  console.log("  MD1, MD4, MD7 -> Groups A-D");
  console.log("  MD2, MD5, MD8 -> Groups E-H");
  console.log("  MD3, MD6, MD9 -> Groups I-L");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
