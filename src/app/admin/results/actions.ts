"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { advanceFromFinalizedMatch } from "@/lib/knockouts";
import { recomputeAllUserScores } from "@/lib/scoreEngine";
import { MatchStage, MatchStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type ResultState = { error: string } | null;

export async function finalizeResultAction(
  _prev: ResultState,
  formData: FormData,
): Promise<ResultState> {
  await requireAdmin();
  const matchId = String(formData.get("matchId") ?? "");
  const homeScoreRaw = String(formData.get("homeScore") ?? "");
  const awayScoreRaw = String(formData.get("awayScore") ?? "");
  const homePensRaw = String(formData.get("homePens") ?? "");
  const awayPensRaw = String(formData.get("awayPens") ?? "");
  if (!matchId) return { error: "Missing match ID" };

  const homeScore = Number(homeScoreRaw);
  const awayScore = Number(awayScoreRaw);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return { error: "Scores must be numbers" };
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { stage: true },
  });
  if (!match) return { error: "Match not found" };

  const isKnockout = match.stage !== MatchStage.GROUP;
  const isDraw = homeScore === awayScore;

  const homePens = homePensRaw === "" ? null : Number(homePensRaw);
  const awayPens = awayPensRaw === "" ? null : Number(awayPensRaw);

  if (isKnockout && isDraw) {
    if (!Number.isFinite(homePens) || !Number.isFinite(awayPens)) {
      return { error: "Knockout draws require penalty scores" };
    }
    if (homePens === awayPens) {
      return { error: "Penalty scores must be decisive" };
    }
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      homePenalties: isKnockout && isDraw ? homePens : null,
      awayPenalties: isKnockout && isDraw ? awayPens : null,
      status: MatchStatus.FINAL,
    },
  });

  await advanceFromFinalizedMatch(matchId);
  await recomputeAllUserScores();
  revalidatePath("/admin/results");
  return null;
}
