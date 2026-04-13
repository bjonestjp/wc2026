import { prisma } from "@/lib/prisma";
import { MatchStatus, PickSelection } from "@prisma/client";

export type ScoringConfigShape = {
  pointsPerCorrect: number;
  streakBonusStartAt: number;
  streakBonusPoints: number;
  missedPickBreaksStreak: boolean;
};

const DEFAULT_CONFIG: ScoringConfigShape = {
  pointsPerCorrect: 3,
  streakBonusStartAt: 3,
  streakBonusPoints: 1,
  missedPickBreaksStreak: false,
};

export async function getScoringConfig(): Promise<ScoringConfigShape> {
  const row = await prisma.scoringConfig.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_CONFIG;
  return {
    pointsPerCorrect: row.pointsPerCorrect,
    streakBonusStartAt: row.streakBonusStartAt,
    streakBonusPoints: row.streakBonusPoints,
    missedPickBreaksStreak: row.missedPickBreaksStreak,
  };
}

export function outcomeFromScore(
  homeScore: number,
  awayScore: number,
): PickSelection {
  if (homeScore > awayScore) return PickSelection.HOME;
  if (homeScore < awayScore) return PickSelection.AWAY;
  return PickSelection.DRAW;
}

export function pointsForPick(params: {
  config: ScoringConfigShape;
  isCorrect: boolean;
  streakAfter: number;
}): number {
  const base = params.isCorrect ? params.config.pointsPerCorrect : 0;
  const bonus =
    params.isCorrect && params.streakAfter >= params.config.streakBonusStartAt
      ? params.config.streakBonusPoints
      : 0;
  return base + bonus;
}

export async function assertMatchFinal(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { status: true },
  });
  if (!match || match.status !== MatchStatus.FINAL) {
    throw new Error("Match is not final");
  }
}

