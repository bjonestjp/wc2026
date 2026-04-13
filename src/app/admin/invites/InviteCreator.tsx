"use client";

import { useActionState } from "react";
import { createInviteAction, type CreateInviteState } from "./actions";

export function InviteCreator() {
  const [state, action, pending] = useActionState<
    CreateInviteState | null,
    FormData
  >(createInviteAction, null);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="text-sm font-medium">Create invite code</div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Codes are single-use to claim an account.
      </p>

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Label (optional)</span>
          <input
            name="label"
            className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            placeholder="Brad"
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Expires at (optional)</span>
          <input
            name="expiresAt"
            type="datetime-local"
            className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90 sm:col-span-2"
        >
          {pending ? "Creating…" : "Create code"}
        </button>
      </form>

      {state?.ok === false ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </div>
      ) : null}

      {state?.ok === true ? (
        <div className="mt-4 rounded-xl border border-black/10 bg-black/[.02] p-3 text-sm dark:border-white/10 dark:bg-white/5">
          <div className="font-medium">New code (copy now)</div>
          <div className="mt-1 font-mono text-base">{state.code}</div>
        </div>
      ) : null}
    </div>
  );
}

