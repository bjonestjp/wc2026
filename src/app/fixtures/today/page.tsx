import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PickSelection } from "@prisma/client";
import { LocalTime } from "@/app/components/LocalTime";
import { PickButtons } from "./PickButtons";

export const dynamic = "force-dynamic";

function todayRangeUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return { start, end };
}

export default async function TodayFixturesPage() {
  const user = await requireUser();
  const { start, end } = todayRangeUtc();
  const nowMs = +new Date();

  const matches = await prisma.match.findMany({
    where: { kickoffAt: { gte: start, lt: end } },
    orderBy: { kickoffAt: "asc" },
    include: { homeTeam: true, awayTeam: true, picks: { where: { userId: user.id } } },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Today's fixtures</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Pick the winner (or draw). Picks lock at kickoff.
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
            All fixtures
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
            No fixtures scheduled for today (UTC).
          </div>
        ) : (
          matches.map((m) => {
            const locked = m.kickoffAt.getTime() <= nowMs;
            const hasTeams = Boolean(m.homeTeam && m.awayTeam);
            const existingPick = m.picks[0]?.selection ?? null;
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {(m.homeTeam?.name ?? "TBD")} vs {(m.awayTeam?.name ?? "TBD")}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <LocalTime date={m.kickoffAt.toISOString()} short />
                    {locked ? " • Locked" : ""}
                  </div>
                </div>

                <PickButtons
                  matchId={m.id}
                  options={[
                    { label: m.homeTeam?.name ?? "Home", value: PickSelection.HOME },
                    { label: "Draw", value: PickSelection.DRAW },
                    { label: m.awayTeam?.name ?? "Away", value: PickSelection.AWAY },
                  ]}
                  existingPick={existingPick}
                  locked={locked}
                  hasTeams={hasTeams}
                />

                {!hasTeams ? (
                  <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                    Waiting for bracket advancement to determine teams.
                  </div>
                ) : null}

                {existingPick ? (
                  <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                    Your pick: <span className="font-medium">{existingPick}</span>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
