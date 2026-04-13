import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { InviteCreator } from "./InviteCreator";
import { revokeInviteAction } from "./actions";
import { LocalTime } from "@/app/components/LocalTime";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  const invites = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { claimedByUser: true },
    take: 100,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Invite codes</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Create and revoke single-use codes.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Back
        </Link>
      </div>

      <div className="mt-6">
        <InviteCreator />
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="border-b border-black/10 px-5 py-3 text-sm font-medium dark:border-white/10">
          Recent codes
        </div>
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {invites.length === 0 ? (
            <div className="px-5 py-6 text-sm text-zinc-600 dark:text-zinc-400">
              No invite codes yet.
            </div>
          ) : (
            invites.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {i.label || "Untitled"}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {i.usedAt
                      ? `Used by ${i.claimedByUser?.name ?? "unknown"}`
                      : "Unused"}
                    {i.expiresAt ? <>{" "}• Expires <LocalTime date={i.expiresAt.toISOString()} short /></> : ""}
                  </div>
                </div>
                {!i.usedAt ? (
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10">
                      Revoke
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

