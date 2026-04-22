import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { assignTeamAction, createTeamAction, unassignTeamAction } from "./actions";
import { TeamName } from "@/app/components/TeamName";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { userTeams: { include: { team: true } } },
      take: 200,
    }),
    prisma.team.findMany({ orderBy: { name: "asc" }, take: 100 }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Assign teams from your offline draw.
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
        <div className="text-sm font-medium">Teams (quick add)</div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Minimal helper to enter teams before you start assigning them.
        </p>
        <form action={createTeamAction} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            name="name"
            required
            placeholder="Team name"
            className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
          />
          <input
            name="groupCode"
            placeholder="Group (A-H)"
            className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
          />
          <input
            name="flagCode"
            placeholder="Flag code, e.g. EN (optional)"
            className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
          />
          <button className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 sm:col-span-3">
            Add team
          </button>
        </form>
        <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
          Teams in DB: <span className="font-medium">{teams.length}</span>
        </div>
        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Flag graphics are loaded from filenames that match the team&apos;s flag code.
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="border-b border-black/10 px-5 py-3 text-sm font-medium dark:border-white/10">
          Participants
        </div>
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {users.map((u) => (
            <div key={u.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {u.role}
                  </div>
                </div>

                <form action={assignTeamAction} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <select
                    name="teamId"
                    className="h-10 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Assign team…
                    </option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button className="h-10 rounded-xl bg-black px-3 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                    Add
                  </button>
                </form>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {u.userTeams.length === 0 ? (
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    No teams assigned yet.
                  </span>
                ) : (
                  u.userTeams.map((ut) => (
                    <form key={ut.teamId} action={unassignTeamAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="teamId" value={ut.teamId} />
                      <button className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[.02] px-3 py-1 text-xs hover:bg-black/[.04] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                        <span className="font-medium">
                          <TeamName name={ut.team.name} flagCode={ut.team.flagCode} />
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">Remove</span>
                      </button>
                    </form>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
