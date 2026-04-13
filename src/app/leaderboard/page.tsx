import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await requireUser();

  const rows = await prisma.userScore.findMany({
    orderBy: [{ pointsTotal: "desc" }, { maxStreak: "desc" }],
    include: { user: true },
    take: 200,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Prediction points + streaks.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Home
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="grid grid-cols-[48px_1fr_90px_90px] gap-2 border-b border-black/10 px-5 py-3 text-xs font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-400">
          <div>#</div>
          <div>Name</div>
          <div className="text-right">Points</div>
          <div className="text-right">Streak</div>
        </div>
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {rows.map((r, idx) => (
            <div
              key={r.userId}
              className="grid grid-cols-[48px_1fr_90px_90px] gap-2 px-5 py-3 text-sm"
            >
              <div className="text-zinc-500 dark:text-zinc-400">{idx + 1}</div>
              <div className="font-medium">{r.user.name}</div>
              <div className="text-right tabular-nums">{r.pointsTotal}</div>
              <div className="text-right tabular-nums">{r.currentStreak}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

