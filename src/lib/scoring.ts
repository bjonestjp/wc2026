import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@prisma/client";
import {
  DEFAULT_SCORING_CONFIG,
  outcomeFromScore,
  pointsForPick,
  type ScoringConfigShape,
} from "@/lib/scoring-logic";

export async function getScoringConfig(): Promise<ScoringConfigShape> {
  const row = await prisma.scoringConfig.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_SCORING_CONFIG;
  return {
    pointsPerCorrect: row.pointsPerCorrect,
    streakBonusStartAt: row.streakBonusStartAt,
    streakBonusPoints: row.streakBonusPoints,
    missedPickBreaksStreak: row.missedPickBreaksStreak,
  };
}
export { outcomeFromScore, pointsForPick };

export async function assertMatchFinal(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { status: true },
  });
  if (!match || match.status !== MatchStatus.FINAL) {
    throw new Error("Match is not final");
  }
}
