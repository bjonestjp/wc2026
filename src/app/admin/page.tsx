import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
      <div className="mt-6 grid gap-3">
        <Link
          href="/admin/invites"
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
        >
          <div className="text-sm font-medium">Invite codes</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create/revoke single-use invite codes.
          </div>
        </Link>
        <Link
          href="/admin/users"
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
        >
          <div className="text-sm font-medium">Users & team assignments</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Assign teams to users.
          </div>
        </Link>
        <Link
          href="/admin/fixtures"
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
        >
          <div className="text-sm font-medium">Fixtures</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create and edit match schedule.
          </div>
        </Link>
        <Link
          href="/admin/results"
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
        >
          <div className="text-sm font-medium">Results</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Enter final scores and trigger scoring.
          </div>
        </Link>
        <Link
          href="/admin/knockouts"
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
        >
          <div className="text-sm font-medium">Knockout bracket</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Auto-wire the R32→Final bracket.
          </div>
        </Link>
        <Link
          href="/admin/trivia"
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
        >
          <div className="text-sm font-medium">Daily trivia</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Queue and reorder daily trivia questions.
          </div>
        </Link>
        <Link
          href="/admin/ui-preview"
          className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
        >
          <div className="text-sm font-medium">Prediction UI preview</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Compare correct, incorrect, and pending pick feedback without changing live data.
          </div>
        </Link>
      </div>
    </div>
  );
}
