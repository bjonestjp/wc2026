import { closeDb, prisma } from "./lib/db";
import { requireArg } from "./lib/cli";
import { readJsonFile, type ResultFileRow } from "./lib/tournament-files";
import {
  advanceFromFinalizedMatchScript,
  recomputeAllUserScoresScript,
} from "./lib/tournament-ops";
import { MatchStage, MatchStatus } from "@prisma/client";

async function resolveMatchId(row: ResultFileRow) {
  if (row.stage === MatchStage.GROUP) {
    if (!row.homeTeamName || !row.awayTeamName) {
      throw new Error("Group-stage result rows require homeTeamName and awayTeamName");
    }
    const match = await prisma.match.findFirst({
      where: {
        stage: MatchStage.GROUP,
        groupCode: row.groupCode ?? null,
        homeTeam: { is: { name: row.homeTeamName } },
        awayTeam: { is: { name: row.awayTeamName } },
      },
      select: { id: true },
    });
    return match?.id ?? null;
  }

  const match = await prisma.match.findFirst({
    where: {
      stage: row.stage,
      bracketOrder: row.bracketOrder ?? undefined,
    },
    orderBy: { kickoffAt: "asc" },
    select: { id: true },
  });
  return match?.id ?? null;
}

async function main() {
  const inputPath = requireArg("input");
  const rows = await readJsonFile<ResultFileRow[]>(inputPath);

  for (const row of rows) {
    const matchId = await resolveMatchId(row);
    if (!matchId) {
      throw new Error(`Could not resolve match for ${row.stage} ${row.groupCode ?? row.bracketOrder ?? ""}`);
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.FINAL,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        homePenalties: row.homePenalties ?? null,
        awayPenalties: row.awayPenalties ?? null,
      },
    });

    await advanceFromFinalizedMatchScript(matchId);
  }

  await recomputeAllUserScoresScript();
  console.log(`Applied ${rows.length} results.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
