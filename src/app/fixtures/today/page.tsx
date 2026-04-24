import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PickSelection } from "@prisma/client";
import { LocalTime } from "@/app/components/LocalTime";
import { PickButtons } from "./PickButtons";
import { TeamName } from "@/app/components/TeamName";

export const dynamic = "force-dynamic";

function todayRangeUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return { start, end };
}

export default async function TodayFixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  const { view } = await searchParams;
  const { start, end } = todayRangeUtc();
  const nowMs = +new Date();
  const activeView = view === "all" ? "all" : "current";

  const matches = await prisma.match.findMany({
    where: { kickoffAt: { gte: start, lt: end } },
    orderBy: { kickoffAt: "asc" },
    include: { homeTeam: true, awayTeam: true, picks: { where: { userId: user.id } } },
  });

  const nextKickoffMs =
    matches.find((match) => match.kickoffAt.getTime() > nowMs)?.kickoffAt.getTime() ?? null;

  const visibleMatches =
    activeView === "all" || nextKickoffMs == null
      ? matches
      : matches.filter((match) => match.kickoffAt.getTime() === nextKickoffMs);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Today&apos;s picks</h1>
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

      <div className="mt-6 flex gap-2">
        <Link
          href="/fixtures/today"
          className={[
            "rounded-xl px-3 py-2 text-sm",
            activeView === "current"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "border border-black/10 hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10",
          ].join(" ")}
        >
          Current
        </Link>
        <Link
          href="/fixtures/today?view=all"
          className={[
            "rounded-xl px-3 py-2 text-sm",
            activeView === "all"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "border border-black/10 hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10",
          ].join(" ")}
        >
          All
        </Link>
      </div>

      <div className="mt-8 grid gap-3">
        {visibleMatches.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
            {matches.length === 0
              ? "No fixtures scheduled for today (UTC)."
              : "No remaining matchday blocks for today."}
          </div>
        ) : (
          visibleMatches.map((m) => {
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
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <TeamName teamId={m.homeTeam?.id} name={m.homeTeam?.name} flagCode={m.homeTeam?.flagCode} />
                      <span>vs</span>
                      <TeamName teamId={m.awayTeam?.id} name={m.awayTeam?.name} flagCode={m.awayTeam?.flagCode} />
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <LocalTime date={m.kickoffAt.toISOString()} short />
                    {locked ? " • Locked" : ""}
                  </div>
                </div>

                <PickButtons
                  matchId={m.id}
                  options={[
                    {
                      label: (
                        <TeamName
                          teamId={m.homeTeam?.id}
                          name={m.homeTeam?.name ?? "Home"}
                          flagCode={m.homeTeam?.flagCode}
                          interactive={false}
                        />
                      ),
                      value: PickSelection.HOME,
                    },
                    { label: "Draw", value: PickSelection.DRAW },
                    {
                      label: (
                        <TeamName
                          teamId={m.awayTeam?.id}
                          name={m.awayTeam?.name ?? "Away"}
                          flagCode={m.awayTeam?.flagCode}
                          interactive={false}
                        />
                      ),
                      value: PickSelection.AWAY,
                    },
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
