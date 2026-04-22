import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MatchStage } from "@prisma/client";
import { BracketClient } from "@/app/knockouts/BracketClient";

export const dynamic = "force-dynamic";

const ROUND_ORDER: MatchStage[] = [
  MatchStage.R32,
  MatchStage.R16,
  MatchStage.QF,
  MatchStage.SF,
  MatchStage.THIRD_PLACE,
  MatchStage.FINAL,
];

const ROUND_LABEL: Record<MatchStage, string> = {
  GROUP: "Group",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  THIRD_PLACE: "Third place",
  FINAL: "Final",
};

export default async function KnockoutsPage() {
  await requireUser();

  const [matches, advancements] = await Promise.all([
    prisma.match.findMany({
      where: { stage: { in: ROUND_ORDER } },
      orderBy: [{ stage: "asc" }, { bracketOrder: "asc" }, { kickoffAt: "asc" }],
      include: { homeTeam: true, awayTeam: true },
      take: 200,
    }),
    prisma.matchAdvancement.findMany({
      select: { fromMatchId: true, toMatchId: true, toSlot: true, type: true },
    }),
  ]);

  const isEmpty = matches.length === 0;
  const rounds = ROUND_ORDER.map((stage) => ({
    stage,
    label: ROUND_LABEL[stage],
    matches: matches
      .filter((m) => m.stage === stage)
      .map((m) => ({
        id: m.id,
        stage: m.stage,
        bracketOrder: m.bracketOrder,
        kickoffAtIso: m.kickoffAt.toISOString(),
        status: m.status,
        homeTeamName: m.homeTeam?.name ?? null,
        homeTeamFlagCode: m.homeTeam?.flagCode ?? null,
        awayTeamName: m.awayTeam?.name ?? null,
        awayTeamFlagCode: m.awayTeam?.flagCode ?? null,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homePenalties: m.homePenalties,
        awayPenalties: m.awayPenalties,
      })),
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Knockouts</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Bracket view (R32 onward) based on fixtures you enter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
          >
            Home
          </Link>
          <Link
            href="/fixtures"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
          >
            Fixtures
          </Link>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
          No knockout fixtures yet. Add matches in Admin → Fixtures and set their
          stage to R32/R16/QF/SF/THIRD_PLACE/FINAL.
        </div>
      ) : null}

      <BracketClient rounds={rounds} advancements={advancements} />
    </div>
  );
}
