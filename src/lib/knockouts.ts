import "server-only";

import { prisma } from "@/lib/prisma";
import { compareGroupRows, getGroupTables, type GroupStandingRow } from "@/lib/group-standings";
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

const THIRD_PLACE_WINNER_GROUPS = [
  "A",
  "B",
  "D",
  "E",
  "G",
  "I",
  "K",
  "L",
] as const;

const THIRD_PLACE_ALLOWED_GROUPS: Record<(typeof THIRD_PLACE_WINNER_GROUPS)[number], string[]> = {
  A: ["C", "E", "F", "H", "I"],
  B: ["E", "F", "G", "I", "J"],
  D: ["B", "E", "F", "I", "J"],
  E: ["A", "B", "C", "D", "F"],
  G: ["A", "E", "H", "I", "J"],
  I: ["C", "D", "F", "G", "H"],
  K: ["D", "E", "I", "J", "L"],
  L: ["E", "H", "I", "J", "K"],
};

type R32SlotDefinition =
  | { bracketOrder: number; home: { kind: "group"; groupCode: string; place: 1 | 2 }; away: { kind: "group"; groupCode: string; place: 1 | 2 } }
  | { bracketOrder: number; home: { kind: "group"; groupCode: string; place: 1 | 2 }; away: { kind: "third"; winnerGroup: (typeof THIRD_PLACE_WINNER_GROUPS)[number] } };

const R32_SLOT_DEFINITIONS: R32SlotDefinition[] = [
  { bracketOrder: 1, home: { kind: "group", groupCode: "A", place: 2 }, away: { kind: "group", groupCode: "B", place: 2 } },
  { bracketOrder: 2, home: { kind: "group", groupCode: "E", place: 1 }, away: { kind: "third", winnerGroup: "E" } },
  { bracketOrder: 3, home: { kind: "group", groupCode: "F", place: 1 }, away: { kind: "group", groupCode: "C", place: 2 } },
  { bracketOrder: 4, home: { kind: "group", groupCode: "C", place: 1 }, away: { kind: "group", groupCode: "F", place: 2 } },
  { bracketOrder: 5, home: { kind: "group", groupCode: "I", place: 1 }, away: { kind: "third", winnerGroup: "I" } },
  { bracketOrder: 6, home: { kind: "group", groupCode: "E", place: 2 }, away: { kind: "group", groupCode: "I", place: 2 } },
  { bracketOrder: 7, home: { kind: "group", groupCode: "A", place: 1 }, away: { kind: "third", winnerGroup: "A" } },
  { bracketOrder: 8, home: { kind: "group", groupCode: "L", place: 1 }, away: { kind: "third", winnerGroup: "L" } },
  { bracketOrder: 9, home: { kind: "group", groupCode: "D", place: 1 }, away: { kind: "third", winnerGroup: "D" } },
  { bracketOrder: 10, home: { kind: "group", groupCode: "G", place: 1 }, away: { kind: "third", winnerGroup: "G" } },
  { bracketOrder: 11, home: { kind: "group", groupCode: "K", place: 2 }, away: { kind: "group", groupCode: "L", place: 2 } },
  { bracketOrder: 12, home: { kind: "group", groupCode: "H", place: 1 }, away: { kind: "group", groupCode: "J", place: 2 } },
  { bracketOrder: 13, home: { kind: "group", groupCode: "B", place: 1 }, away: { kind: "third", winnerGroup: "B" } },
  { bracketOrder: 14, home: { kind: "group", groupCode: "J", place: 1 }, away: { kind: "group", groupCode: "H", place: 2 } },
  { bracketOrder: 15, home: { kind: "group", groupCode: "K", place: 1 }, away: { kind: "third", winnerGroup: "K" } },
  { bracketOrder: 16, home: { kind: "group", groupCode: "D", place: 2 }, away: { kind: "group", groupCode: "G", place: 2 } },
];

function combinationKey(groupCodes: string[]) {
  return [...groupCodes].sort().join("");
}

function findLexicographicThirdAssignments(groupCodes: string[]) {
  const available = new Set(groupCodes);
  const winnerGroups = [...THIRD_PLACE_WINNER_GROUPS];
  let best: Record<string, string> | null = null;

  function backtrack(index: number, assigned: Record<string, string>) {
    if (best) return;
    if (index >= winnerGroups.length) {
      best = { ...assigned };
      return;
    }

    const winnerGroup = winnerGroups[index];
    const candidates = THIRD_PLACE_ALLOWED_GROUPS[winnerGroup]
      .filter((groupCode) => available.has(groupCode))
      .sort();

    for (const candidate of candidates) {
      available.delete(candidate);
      assigned[winnerGroup] = candidate;
      backtrack(index + 1, assigned);
      if (best) return;
      delete assigned[winnerGroup];
      available.add(candidate);
    }
  }

  backtrack(0, {});
  return best;
}

function resolveThirdPlaceAssignments(thirdPlacedRows: GroupStandingRow[]) {
  const qualifiedGroupCodes = thirdPlacedRows.map((row) => row.groupCode);
  const assignments = findLexicographicThirdAssignments(qualifiedGroupCodes);
  if (!assignments) {
    throw new Error(`Could not resolve third-place assignments for ${combinationKey(qualifiedGroupCodes)}`);
  }
  return assignments;
}

export async function populateRoundOf32FromGroups() {
  const [groupTables, r32Matches] = await Promise.all([
    getGroupTables(),
    prisma.match.findMany({
      where: { stage: MatchStage.R32 },
      orderBy: [{ bracketOrder: "asc" }, { kickoffAt: "asc" }],
      select: {
        id: true,
        bracketOrder: true,
        status: true,
        homeTeamId: true,
        awayTeamId: true,
      },
      take: 32,
    }),
  ]);

  const tableByGroupCode = new Map(groupTables.map((table) => [table.groupCode, table]));
  const r32ByOrder = new Map(r32Matches.map((match) => [match.bracketOrder ?? 0, match]));
  const completedTables = groupTables.filter((table) => table.isComplete);

  const thirdPlaceAssignments =
    completedTables.length === groupTables.length
      ? resolveThirdPlaceAssignments(
          completedTables
            .map((table) => table.rows[2] ?? null)
            .filter((row): row is GroupStandingRow => Boolean(row))
            .sort(compareGroupRows)
            .slice(0, 8),
        )
      : null;

  await prisma.$transaction(async (tx) => {
    for (const definition of R32_SLOT_DEFINITIONS) {
      const match = r32ByOrder.get(definition.bracketOrder);
      if (!match || match.status === MatchStatus.FINAL) continue;

      const homeGroupTable = tableByGroupCode.get(definition.home.groupCode);
      const homeTeamId =
        homeGroupTable?.isComplete
          ? homeGroupTable.rows[definition.home.place - 1]?.teamId ?? null
          : null;

      let awayTeamId: string | null = null;
      if (definition.away.kind === "group") {
        const awayGroupTable = tableByGroupCode.get(definition.away.groupCode);
        awayTeamId =
          awayGroupTable?.isComplete
            ? awayGroupTable.rows[definition.away.place - 1]?.teamId ?? null
            : null;
      } else if (thirdPlaceAssignments) {
        const thirdGroupCode = thirdPlaceAssignments[definition.away.winnerGroup];
        const awayGroupTable = tableByGroupCode.get(thirdGroupCode);
        awayTeamId = awayGroupTable?.rows[2]?.teamId ?? null;
      }

      await tx.match.update({
        where: { id: match.id },
        data: {
          homeTeamId,
          awayTeamId,
        },
      });
    }
  });
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
