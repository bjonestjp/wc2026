import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@prisma/client";
import { LocalTime } from "@/app/components/LocalTime";
import { ResultForm } from "./ResultForm";
import { TeamName } from "@/app/components/TeamName";
import { InlineMatchScore } from "@/app/components/InlineMatchScore";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "desc" },
    include: { homeTeam: true, awayTeam: true },
    take: 200,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Results</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter final scores (this will later trigger scoring).
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Back
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="border-b border-black/10 px-5 py-3 text-sm font-medium dark:border-white/10">
          Matches
        </div>
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {matches.length === 0 ? (
            <div className="px-5 py-6 text-sm text-zinc-600 dark:text-zinc-400">
              No matches yet.
            </div>
          ) : (
            matches.map((m) => (
              <div key={m.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <TeamName teamId={m.homeTeam?.id} name={m.homeTeam?.name} flagCode={m.homeTeam?.flagCode} />
                      <span>vs</span>
                      <TeamName teamId={m.awayTeam?.id} name={m.awayTeam?.name} flagCode={m.awayTeam?.flagCode} />
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <LocalTime date={m.kickoffAt.toISOString()} short /> • {m.stage}
                  </div>
                </div>

                {m.status === MatchStatus.FINAL ? (
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">Final:</span>{" "}
                    <InlineMatchScore
                      homeTeam={{
                        id: m.homeTeam?.id,
                        name: m.homeTeam?.name,
                        flagCode: m.homeTeam?.flagCode,
                      }}
                      awayTeam={{
                        id: m.awayTeam?.id,
                        name: m.awayTeam?.name,
                        flagCode: m.awayTeam?.flagCode,
                      }}
                      homeScore={m.homeScore}
                      awayScore={m.awayScore}
                      interactive={false}
                      className="font-medium text-zinc-800 dark:text-zinc-200"
                      scoreClassName="text-sm font-semibold text-zinc-500 dark:text-zinc-400"
                    />
                    {m.homePenalties != null && m.awayPenalties != null ? (
                      <span className="ml-2 text-xs">
                        (pens {m.homePenalties}–{m.awayPenalties})
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <ResultForm matchId={m.id} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
