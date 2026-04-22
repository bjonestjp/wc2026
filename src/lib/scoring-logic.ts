import { PickSelection } from "@prisma/client";

export type ScoringConfigShape = {
  pointsPerCorrect: number;
  streakBonusStartAt: number;
  streakBonusPoints: number;
  missedPickBreaksStreak: boolean;
};

export const DEFAULT_SCORING_CONFIG: ScoringConfigShape = {
  pointsPerCorrect: 3,
  streakBonusStartAt: 3,
  streakBonusPoints: 1,
  missedPickBreaksStreak: false,
};

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
