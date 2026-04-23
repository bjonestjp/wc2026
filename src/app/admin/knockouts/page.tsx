import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MatchStage } from "@prisma/client";
import { getGroupTables } from "@/lib/group-standings";
import { populateRoundOf32Action, setupKnockoutBracketAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminKnockoutsPage() {
  const [counts, advCount, groupTables] = await Promise.all([
    prisma.match.groupBy({
      by: ["stage"],
      where: { stage: { in: [MatchStage.R32, MatchStage.R16, MatchStage.QF, MatchStage.SF, MatchStage.THIRD_PLACE, MatchStage.FINAL] } },
      _count: { _all: true },
    }),
    prisma.matchAdvancement.count(),
    getGroupTables(),
  ]);

  const countByStage = new Map(counts.map((c) => [c.stage, c._count._all]));
  const completedGroups = groupTables.filter((table) => table.isComplete).length;
  const totalGroups = groupTables.length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Knockout bracket</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Auto-wire the bracket based on kickoff-time order within each round.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Back
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="text-sm font-medium">Round counts</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <div>R32</div>
          <div className="text-right tabular-nums">{countByStage.get(MatchStage.R32) ?? 0}</div>
          <div>R16</div>
          <div className="text-right tabular-nums">{countByStage.get(MatchStage.R16) ?? 0}</div>
          <div>QF</div>
          <div className="text-right tabular-nums">{countByStage.get(MatchStage.QF) ?? 0}</div>
          <div>SF</div>
          <div className="text-right tabular-nums">{countByStage.get(MatchStage.SF) ?? 0}</div>
          <div>Third place</div>
          <div className="text-right tabular-nums">{countByStage.get(MatchStage.THIRD_PLACE) ?? 0}</div>
          <div>Final</div>
          <div className="text-right tabular-nums">{countByStage.get(MatchStage.FINAL) ?? 0}</div>
          <div>Advancement links</div>
          <div className="text-right tabular-nums">{advCount}</div>
        </div>

        <form action={setupKnockoutBracketAction} className="mt-5">
          <button className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
            Auto-wire bracket
          </button>
        </form>

        <form action={populateRoundOf32Action} className="mt-3">
          <button className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm font-medium hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10">
            Populate R32 from group tables
          </button>
        </form>

        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          This sets `bracketOrder` per round and creates advancement links:
          winners advance through rounds; semi-final losers go to third-place.
        </p>
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          Group tables complete: {completedGroups}/{totalGroups}. Fixed winner/runner-up
          pairings populate as soon as those groups are complete. Third-place-dependent
          R32 slots populate once all groups are complete.
        </p>
      </div>
    </div>
  );
}
