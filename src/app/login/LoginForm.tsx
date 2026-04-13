"use client";

import { useActionState } from "react";
import { claimInviteAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    claimInviteAction,
    null,
  );

  return (
    <>
      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="code" className="text-sm font-medium">
            Invite code
          </label>
          <input
            id="code"
            name="code"
            autoComplete="one-time-code"
            required
            className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none ring-0 focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            placeholder="e.g. WC-ABCD1234"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="name"
            name="name"
            required
            className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none ring-0 focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            placeholder="Brad"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          {pending ? "Signing in…" : "Continue"}
        </button>
      </form>

      {state?.error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </div>
      ) : null}
    </>
  );
}
