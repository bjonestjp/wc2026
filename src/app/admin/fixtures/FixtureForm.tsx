"use client";

import { useActionState } from "react";
import { createFixtureAction, type FixtureState } from "./actions";
import type { MatchStage } from "@prisma/client";

type Props = {
  teams: Array<{ id: string; name: string }>;
  stages: MatchStage[];
  defaultStage: MatchStage;
};

export function FixtureForm({ teams, stages, defaultStage }: Props) {
  const [state, action, pending] = useActionState<FixtureState, FormData>(
    createFixtureAction,
    null,
  );

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="text-sm font-medium">Create fixture</div>
      <form action={action} className="mt-4 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Home</span>
            <select
              name="homeTeamId"
              required
              className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Away</span>
            <select
              name="awayTeamId"
              required
              className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
              defaultValue=""
            >
              <option value="" disabled>
                Select…
              </option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Kickoff (local)</span>
            <input
              name="kickoffAt"
              type="datetime-local"
              required
              className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Stage</span>
            <select
              name="stage"
              required
              className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
              defaultValue={defaultStage}
            >
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Group (optional)</span>
            <input
              name="groupCode"
              className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
              placeholder="A"
            />
          </label>
        </div>

        <button
          disabled={pending}
          className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          {pending ? "Creating…" : "Create fixture"}
        </button>
      </form>

      {state?.error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </div>
      ) : null}
    </div>
  );
}
