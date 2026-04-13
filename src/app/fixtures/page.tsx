import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LocalTime } from "@/app/components/LocalTime";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  await requireUser();
  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: { homeTeam: true, awayTeam: true },
    take: 500,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Fixtures</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Full schedule.
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
            href="/fixtures/today"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
          >
            Today
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {matches.length === 0 ? (
            <div className="px-5 py-6 text-sm text-zinc-600 dark:text-zinc-400">
              No fixtures yet.
            </div>
          ) : (
            matches.map((m) => (
              <div key={m.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {(m.homeTeam?.name ?? "TBD")} vs {(m.awayTeam?.name ?? "TBD")}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <LocalTime date={m.kickoffAt.toISOString()} short /> • {m.stage}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

