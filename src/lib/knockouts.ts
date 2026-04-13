import "server-only";

import { prisma } from "@/lib/prisma";
import {
  AdvancementType,
  KnockoutSlot,
  MatchStage,
  MatchStatus,
} from "@prisma/client";

function roundPairs<T>(arr: T[]): Array<[T, T]> {
  const out: Array<[T, T]> = [];
  for (let i = 0; i + 1 < arr.length; i += 2) out.push([arr[i], arr[i + 1]]);
  return out;
}

export async function autoWireKnockoutBracket() {
  // Order within each round is determined by kickoff time (admin-controlled).
  const [r32, r16, qf, sf, thirdPlace, finalMatch] = await Promise.all([
    prisma.match.findMany({
      where: { stage: MatchStage.R32 },
      orderBy: { kickoffAt: "asc" },
      select: { id: true },
      take: 32,
    }),
    prisma.match.findMany({
      where: { stage: MatchStage.R16 },
      orderBy: { kickoffAt: "asc" },
      select: { id: true },
      take: 16,
    }),
    prisma.match.findMany({
      where: { stage: MatchStage.QF },
      orderBy: { kickoffAt: "asc" },
      select: { id: true },
      take: 8,
    }),
    prisma.match.findMany({
      where: { stage: MatchStage.SF },
      orderBy: { kickoffAt: "asc" },
      select: { id: true },
      take: 4,
    }),
    prisma.match.findMany({
      where: { stage: MatchStage.THIRD_PLACE },
      orderBy: { kickoffAt: "asc" },
      select: { id: true },
      take: 1,
    }),
    prisma.match.findMany({
      where: { stage: MatchStage.FINAL },
      orderBy: { kickoffAt: "asc" },
      select: { id: true },
      take: 1,
    }),
  ]);

  const finalId = finalMatch[0]?.id ?? null;
  const thirdId = thirdPlace[0]?.id ?? null;

  await prisma.$transaction(async (tx) => {
    // Set bracketOrder for each stage.
    const setOrder = async (stage: MatchStage, ids: { id: string }[]) => {
      await Promise.all(
        ids.map((m, idx) =>
          tx.match.update({ where: { id: m.id }, data: { bracketOrder: idx + 1 } }),
        ),
      );
    };
    await setOrder(MatchStage.R32, r32);
    await setOrder(MatchStage.R16, r16);
    await setOrder(MatchStage.QF, qf);
    await setOrder(MatchStage.SF, sf);
    await setOrder(MatchStage.THIRD_PLACE, thirdPlace);
    await setOrder(MatchStage.FINAL, finalMatch);

    // Clear existing wiring.
    await tx.matchAdvancement.deleteMany({
      where: { fromMatch: { stage: { in: [MatchStage.R32, MatchStage.R16, MatchStage.QF, MatchStage.SF] } } },
    });

    // R32 -> R16
    for (const [pairIdx, [a, b]] of roundPairs(r32).entries()) {
      const next = r16[pairIdx]?.id ?? null;
      if (!next) break;
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: a.id,
          toMatchId: next,
          toSlot: KnockoutSlot.HOME,
          type: AdvancementType.WINNER,
        },
      });
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: b.id,
          toMatchId: next,
          toSlot: KnockoutSlot.AWAY,
          type: AdvancementType.WINNER,
        },
      });
    }

    // R16 -> QF
    for (const [pairIdx, [a, b]] of roundPairs(r16).entries()) {
      const next = qf[pairIdx]?.id ?? null;
      if (!next) break;
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: a.id,
          toMatchId: next,
          toSlot: KnockoutSlot.HOME,
          type: AdvancementType.WINNER,
        },
      });
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: b.id,
          toMatchId: next,
          toSlot: KnockoutSlot.AWAY,
          type: AdvancementType.WINNER,
        },
      });
    }

    // QF -> SF
    for (const [pairIdx, [a, b]] of roundPairs(qf).entries()) {
      const next = sf[pairIdx]?.id ?? null;
      if (!next) break;
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: a.id,
          toMatchId: next,
          toSlot: KnockoutSlot.HOME,
          type: AdvancementType.WINNER,
        },
      });
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: b.id,
          toMatchId: next,
          toSlot: KnockoutSlot.AWAY,
          type: AdvancementType.WINNER,
        },
      });
    }

    // SF -> FINAL (winner) and SF -> THIRD_PLACE (loser)
    if (finalId && sf.length >= 2) {
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: sf[0].id,
          toMatchId: finalId,
          toSlot: KnockoutSlot.HOME,
          type: AdvancementType.WINNER,
        },
      });
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: sf[1].id,
          toMatchId: finalId,
          toSlot: KnockoutSlot.AWAY,
          type: AdvancementType.WINNER,
        },
      });
    }
    if (thirdId && sf.length >= 2) {
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: sf[0].id,
          toMatchId: thirdId,
          toSlot: KnockoutSlot.HOME,
          type: AdvancementType.LOSER,
        },
      });
      await tx.matchAdvancement.create({
        data: {
          fromMatchId: sf[1].id,
          toMatchId: thirdId,
          toSlot: KnockoutSlot.AWAY,
          type: AdvancementType.LOSER,
        },
      });
    }
  });
}

export async function advanceFromFinalizedMatch(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      stage: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      homePenalties: true,
      awayPenalties: true,
      advancements: {
        select: { toMatchId: true, toSlot: true, type: true },
      },
    },
  });
  if (!match) return;
  if (match.status !== MatchStatus.FINAL) return;
  if (match.advancements.length === 0) return;
  if (!match.homeTeamId || !match.awayTeamId) return;
  if (match.homeScore == null || match.awayScore == null) return;

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
    for (const adv of match.advancements) {
      const teamId =
        adv.type === AdvancementType.WINNER ? winnerTeamId : loserTeamId;

      const next = await tx.match.findUnique({
        where: { id: adv.toMatchId },
        select: { homeTeamId: true, awayTeamId: true },
      });
      if (!next) continue;

      const field = adv.toSlot === KnockoutSlot.HOME ? "homeTeamId" : "awayTeamId";
      const existing = adv.toSlot === KnockoutSlot.HOME ? next.homeTeamId : next.awayTeamId;
      if (existing && existing !== teamId) continue;

      await tx.match.update({
        where: { id: adv.toMatchId },
        data: { [field]: teamId } as { homeTeamId?: string; awayTeamId?: string },
      });
    }
  });
}

