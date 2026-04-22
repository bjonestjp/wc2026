"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { submitPickAction, type PickState } from "./actions";

type Props = {
  matchId: string;
  options: Array<{ label: ReactNode; value: string }>;
  existingPick: string | null;
  locked: boolean;
  hasTeams: boolean;
};

export function PickButtons({ matchId, options, existingPick, locked, hasTeams }: Props) {
  const [state, action, pending] = useActionState<PickState, FormData>(
    submitPickAction,
    null,
  );

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => (
          <form key={opt.value} action={action}>
            <input type="hidden" name="matchId" value={matchId} />
            <input type="hidden" name="selection" value={opt.value} />
            <button
              disabled={locked || !hasTeams || pending}
              className={[
                "h-10 rounded-full border px-4 text-sm transition-colors disabled:opacity-50",
                existingPick === opt.value
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black/10 hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10",
              ].join(" ")}
            >
              {opt.label}
            </button>
          </form>
        ))}
      </div>

      {state?.error ? (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-700 dark:text-red-300">
          {state.error}
        </div>
      ) : null}
    </>
  );
}
