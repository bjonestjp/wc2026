import {
  AdvancementType,
  KnockoutSlot,
  MatchStage,
  MatchStatus,
  PickSelection,
} from "@prisma/client";
import { prisma } from "./db";

function roundPairs<T>(arr: T[]): Array<[T, T]> {
  const out: Array<[T, T]> = [];
  for (let i = 0; i + 1 < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

function outcomeFromScore(homeScore: number, awayScore: number): PickSelection {
  if (homeScore > awayScore) return PickSelection.HOME;
  if (homeScore < awayScore) return PickSelection.AWAY;
  return PickSelection.DRAW;
}

function pointsForPick(params: {
  pointsPerCorrect: number;
  streakBonusStartAt: number;
  streakBonusPoints: number;
  isCorrect: boolean;
  streakAfter: number;
}) {
  const base = params.isCorrect ? params.pointsPerCorrect : 0;
  const bonus =
    params.isCorrect && params.streakAfter >= params.streakBonusStartAt
      ? params.streakBonusPoints
      : 0;
  return base + bonus;
}

export function getTriviaDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftTriviaDateKey(dateKey: string, days: number): string {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const shifted = new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw) + days));
  return shifted.toISOString().slice(0, 10);
}

export async function autoWireKnockoutBracketScript() {
  const [r32, r16, qf, sf, thirdPlace, finalMatch] = await Promise.all([
    prisma.match.findMany({ where: { stage: MatchStage.R32 }, orderBy: { kickoffAt: "asc" }, select: { id: true }, take: 32 }),
    prisma.match.findMany({ where: { stage: MatchStage.R16 }, orderBy: { kickoffAt: "asc" }, select: { id: true }, take: 16 }),
    prisma.match.findMany({ where: { stage: MatchStage.QF }, orderBy: { kickoffAt: "asc" }, select: { id: true }, take: 8 }),
    prisma.match.findMany({ where: { stage: MatchStage.SF }, orderBy: { kickoffAt: "asc" }, select: { id: true }, take: 4 }),
    prisma.match.findMany({ where: { stage: MatchStage.THIRD_PLACE }, orderBy: { kickoffAt: "asc" }, select: { id: true }, take: 1 }),
    prisma.match.findMany({ where: { stage: MatchStage.FINAL }, orderBy: { kickoffAt: "asc" }, select: { id: true }, take: 1 }),
  ]);

  const finalId = finalMatch[0]?.id ?? null;
  const thirdId = thirdPlace[0]?.id ?? null;

  await prisma.$transaction(async (tx) => {
    const setOrder = async (ids: { id: string }[]) => {
      await Promise.all(ids.map((match, index) => tx.match.update({
        where: { id: match.id },
        data: { bracketOrder: index + 1 },
      })));
    };

    await setOrder(r32);
    await setOrder(r16);
    await setOrder(qf);
    await setOrder(sf);
    await setOrder(thirdPlace);
    await setOrder(finalMatch);

    await tx.matchAdvancement.deleteMany({
      where: { fromMatch: { stage: { in: [MatchStage.R32, MatchStage.R16, MatchStage.QF, MatchStage.SF] } } },
    });

    for (const [pairIdx, [a, b]] of roundPairs(r32).entries()) {
      const next = r16[pairIdx]?.id;
      if (!next) break;
      await tx.matchAdvancement.createMany({
        data: [
          { fromMatchId: a.id, toMatchId: next, toSlot: KnockoutSlot.HOME, type: AdvancementType.WINNER },
          { fromMatchId: b.id, toMatchId: next, toSlot: KnockoutSlot.AWAY, type: AdvancementType.WINNER },
        ],
      });
    }

    for (const [pairIdx, [a, b]] of roundPairs(r16).entries()) {
      const next = qf[pairIdx]?.id;
      if (!next) break;
      await tx.matchAdvancement.createMany({
        data: [
          { fromMatchId: a.id, toMatchId: next, toSlot: KnockoutSlot.HOME, type: AdvancementType.WINNER },
          { fromMatchId: b.id, toMatchId: next, toSlot: KnockoutSlot.AWAY, type: AdvancementType.WINNER },
        ],
      });
    }

    for (const [pairIdx, [a, b]] of roundPairs(qf).entries()) {
      const next = sf[pairIdx]?.id;
      if (!next) break;
      await tx.matchAdvancement.createMany({
        data: [
          { fromMatchId: a.id, toMatchId: next, toSlot: KnockoutSlot.HOME, type: AdvancementType.WINNER },
          { fromMatchId: b.id, toMatchId: next, toSlot: KnockoutSlot.AWAY, type: AdvancementType.WINNER },
        ],
      });
    }

    if (finalId && sf.length >= 2) {
      await tx.matchAdvancement.createMany({
        data: [
          { fromMatchId: sf[0].id, toMatchId: finalId, toSlot: KnockoutSlot.HOME, type: AdvancementType.WINNER },
          { fromMatchId: sf[1].id, toMatchId: finalId, toSlot: KnockoutSlot.AWAY, type: AdvancementType.WINNER },
        ],
      });
    }

    if (thirdId && sf.length >= 2) {
      await tx.matchAdvancement.createMany({
        data: [
          { fromMatchId: sf[0].id, toMatchId: thirdId, toSlot: KnockoutSlot.HOME, type: AdvancementType.LOSER },
          { fromMatchId: sf[1].id, toMatchId: thirdId, toSlot: KnockoutSlot.AWAY, type: AdvancementType.LOSER },
        ],
      });
    }
  });
}

export async function advanceFromFinalizedMatchScript(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      homePenalties: true,
      awayPenalties: true,
      advancements: { select: { toMatchId: true, toSlot: true, type: true } },
    },
  });
  if (!match || match.status !== MatchStatus.FINAL || match.advancements.length === 0) return;
  if (!match.homeTeamId || !match.awayTeamId || match.homeScore == null || match.awayScore == null) return;

  const isDrawAfterET = match.homeScore === match.awayScore;
  const hasPens =
    match.homePenalties != null &&
    match.awayPenalties != null &&
    match.homePenalties !== match.awayPenalties;
  if (isDrawAfterET && !hasPens) return;

  const homeWon =
    match.homeScore > match.awayScore ||
    (isDrawAfterET && (match.homePenalties ?? 0) > (match.awayPenalties ?? 0));
  const winnerTeamId = homeWon ? match.homeTeamId : match.awayTeamId;
  const loserTeamId = homeWon ? match.awayTeamId : match.homeTeamId;

  await prisma.$transaction(async (tx) => {
    for (const advancement of match.advancements) {
      const teamId = advancement.type === AdvancementType.WINNER ? winnerTeamId : loserTeamId;
      const next = await tx.match.findUnique({
        where: { id: advancement.toMatchId },
        select: { homeTeamId: true, awayTeamId: true },
      });
      if (!next) continue;

      const field = advancement.toSlot === KnockoutSlot.HOME ? "homeTeamId" : "awayTeamId";
      const existing = advancement.toSlot === KnockoutSlot.HOME ? next.homeTeamId : next.awayTeamId;
      if (existing && existing !== teamId) continue;

      await tx.match.update({
        where: { id: advancement.toMatchId },
        data: { [field]: teamId } as { homeTeamId?: string; awayTeamId?: string },
      });
    }
  });
}

export async function recomputeAllUserScoresScript() {
  const config = await prisma.scoringConfig.findUnique({ where: { id: 1 } });
  const scoring = {
    pointsPerCorrect: config?.pointsPerCorrect ?? 3,
    streakBonusStartAt: config?.streakBonusStartAt ?? 3,
    streakBonusPoints: config?.streakBonusPoints ?? 1,
    missedPickBreaksStreak: config?.missedPickBreaksStreak ?? false,
  };

  const [users, finalMatches] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.match.findMany({
      where: { status: MatchStatus.FINAL },
      orderBy: { kickoffAt: "asc" },
      select: { id: true, homeScore: true, awayScore: true },
    }),
  ]);

  const matchIds = finalMatches.map((match) => match.id);
  const picks = matchIds.length
    ? await prisma.pick.findMany({
        where: { matchId: { in: matchIds } },
        select: { userId: true, matchId: true, selection: true },
      })
    : [];

  const pickByUserMatch = new Map<string, PickSelection>();
  for (const pick of picks) {
    pickByUserMatch.set(`${pick.userId}:${pick.matchId}`, pick.selection);
  }

  await prisma.$transaction(async (tx) => {
    await tx.scoreEvent.deleteMany({});
    await tx.userScore.deleteMany({});

    for (const user of users) {
      let pointsTotal = 0;
      let currentStreak = 0;
      let maxStreak = 0;

      for (const match of finalMatches) {
        const selection = pickByUserMatch.get(`${user.id}:${match.id}`) ?? null;
        const outcome =
          match.homeScore == null || match.awayScore == null
            ? null
            : outcomeFromScore(match.homeScore, match.awayScore);

        if (selection && outcome) {
          const isCorrect = selection === outcome;
          const streakAfter = isCorrect ? currentStreak + 1 : 0;
          const pointsAwarded = pointsForPick({
            ...scoring,
            isCorrect,
            streakAfter,
          });

          currentStreak = streakAfter;
          maxStreak = Math.max(maxStreak, currentStreak);
          pointsTotal += pointsAwarded;

          await tx.scoreEvent.create({
            data: {
              userId: user.id,
              matchId: match.id,
              pointsAwarded,
              streakAfter: currentStreak,
            },
          });
        } else if (outcome) {
          if (scoring.missedPickBreaksStreak) currentStreak = 0;
          await tx.scoreEvent.create({
            data: {
              userId: user.id,
              matchId: match.id,
              pointsAwarded: 0,
              streakAfter: currentStreak,
            },
          });
        }
      }

      await tx.userScore.create({
        data: { userId: user.id, pointsTotal, currentStreak, maxStreak },
      });
    }
  });
}
