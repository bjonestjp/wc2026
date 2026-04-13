import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LocalTime } from "@/app/components/LocalTime";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  await requireUser();
  const { teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });
  if (!team) notFound();

  const [holders, fixtures] = await Promise.all([
    prisma.userTeam.findMany({
      where: { teamId },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.match.findMany({
      where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: "asc" },
      take: 200,
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{team.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {team.groupCode ? `Group ${team.groupCode}` : "Team draw"}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Home
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-medium">Who drew this team</div>
          <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {holders.length === 0 ? (
              <div>No users assigned yet.</div>
            ) : (
              holders.map((h) => <div key={h.userId}>{h.user.name}</div>)
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-medium">Quick links</div>
          <div className="mt-3 grid gap-2">
            <Link
              href="/fixtures/today"
              className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
            >
              Today’s picks
            </Link>
            <Link
              href="/fixtures"
              className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
            >
              All fixtures
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="border-b border-black/10 px-5 py-3 text-sm font-medium dark:border-white/10">
          Fixtures
        </div>
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {fixtures.length === 0 ? (
            <div className="px-5 py-6 text-sm text-zinc-600 dark:text-zinc-400">
              No fixtures for this team yet.
            </div>
          ) : (
            fixtures.map((m) => (
              <div key={m.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {(m.homeTeam?.name ?? "TBD")} vs {(m.awayTeam?.name ?? "TBD")}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <LocalTime date={m.kickoffAt.toISOString()} short /> • {m.stage} • {m.status}
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

