import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { TeamName } from "@/app/components/TeamName";
import { getGroupTables } from "@/lib/group-standings";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requireUser();
  const groups = await getGroupTables();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Groups</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tables are computed from finalized group-stage results.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Home
        </Link>
      </div>

      <div className="mt-8 grid gap-6">
        {groups.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
            No groups yet. Add teams with a group letter (A–H) in Admin → Users.
          </div>
        ) : (
          groups.map((g) => (
            <div
              key={g.groupCode}
              className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
            >
              <div className="border-b border-black/10 px-5 py-3 text-sm font-medium dark:border-white/10">
                Group {g.groupCode}
              </div>

              <div className="grid grid-cols-[1fr_36px_36px_36px_36px_44px_44px_44px_44px] gap-2 border-b border-black/10 px-5 py-3 text-[11px] font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                <div>Team</div>
                <div className="text-right">P</div>
                <div className="text-right">W</div>
                <div className="text-right">D</div>
                <div className="text-right">L</div>
                <div className="text-right">GF</div>
                <div className="text-right">GA</div>
                <div className="text-right">GD</div>
                <div className="text-right">Pts</div>
              </div>

              <div className="divide-y divide-black/10 dark:divide-white/10">
                {g.rows.map((r) => (
                  <div
                    key={r.teamId}
                    className="grid grid-cols-[1fr_36px_36px_36px_36px_44px_44px_44px_44px] gap-2 px-5 py-3 text-sm"
                  >
                    <div className="min-w-0 font-medium">
                      <TeamName teamId={r.teamId} name={r.teamName} flagCode={r.flagCode} />
                    </div>
                    <div className="text-right tabular-nums">{r.played}</div>
                    <div className="text-right tabular-nums">{r.won}</div>
                    <div className="text-right tabular-nums">{r.drawn}</div>
                    <div className="text-right tabular-nums">{r.lost}</div>
                    <div className="text-right tabular-nums">{r.gf}</div>
                    <div className="text-right tabular-nums">{r.ga}</div>
                    <div className="text-right tabular-nums">
                      {r.gd > 0 ? `+${r.gd}` : r.gd}
                    </div>
                    <div className="text-right tabular-nums font-semibold">
                      {r.pts}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                Tie-break: Pts → GD → GF.
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
