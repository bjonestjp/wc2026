import { describe, expect, it } from "vitest";
import { PickSelection } from "@prisma/client";
import {
  outcomeFromScore,
  pointsForPick,
  type ScoringConfigShape,
} from "@/lib/scoring-logic";

const config: ScoringConfigShape = {
  pointsPerCorrect: 3,
  streakBonusStartAt: 3,
  streakBonusPoints: 1,
  missedPickBreaksStreak: false,
};

describe("outcomeFromScore", () => {
  it("returns HOME when the home team wins", () => {
    expect(outcomeFromScore(2, 1)).toBe(PickSelection.HOME);
  });

  it("returns AWAY when the away team wins", () => {
    expect(outcomeFromScore(0, 3)).toBe(PickSelection.AWAY);
  });

  it("returns DRAW when the scores are level", () => {
    expect(outcomeFromScore(1, 1)).toBe(PickSelection.DRAW);
  });
});

describe("pointsForPick", () => {
  it("awards base points for a correct pick before the streak threshold", () => {
    expect(
      pointsForPick({
        config,
        isCorrect: true,
        streakAfter: 2,
      }),
    ).toBe(3);
  });

  it("adds the streak bonus once the threshold is reached", () => {
    expect(
      pointsForPick({
        config,
        isCorrect: true,
        streakAfter: 3,
      }),
    ).toBe(4);
  });

  it("awards zero points for an incorrect pick", () => {
    expect(
      pointsForPick({
        config,
        isCorrect: false,
        streakAfter: 5,
      }),
    ).toBe(0);
  });
});
