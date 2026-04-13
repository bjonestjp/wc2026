"use client";

import { useActionState } from "react";
import { finalizeResultAction, type ResultState } from "./actions";

type Props = {
  matchId: string;
};

export function ResultForm({ matchId }: Props) {
  const [state, action, pending] = useActionState<ResultState, FormData>(
    finalizeResultAction,
    null,
  );

  return (
    <>
      <form
        action={action}
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="matchId" value={matchId} />
        <input
          name="homeScore"
          inputMode="numeric"
          className="h-10 w-16 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
          placeholder="0"
          required
        />
        <span className="text-sm text-zinc-500">-</span>
        <input
          name="awayScore"
          inputMode="numeric"
          className="h-10 w-16 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
          placeholder="0"
          required
        />
        <span className="text-xs text-zinc-500">pens</span>
        <input
          name="homePens"
          inputMode="numeric"
          className="h-10 w-16 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
          placeholder="(opt)"
        />
        <span className="text-sm text-zinc-500">-</span>
        <input
          name="awayPens"
          inputMode="numeric"
          className="h-10 w-16 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
          placeholder="(opt)"
        />
        <button
          disabled={pending}
          className="h-10 rounded-xl bg-black px-3 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          {pending ? "Saving…" : "Finalize"}
        </button>
      </form>

      {state?.error ? (
        <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
          {state.error}
        </div>
      ) : null}
    </>
  );
}
