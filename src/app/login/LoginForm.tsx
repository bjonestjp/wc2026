"use client";

import { useActionState, useState } from "react";
import { claimInviteAction, loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [tab, setTab] = useState<"login" | "invite">("login");

  const [loginState, loginFormAction, loginPending] = useActionState<LoginState, FormData>(
    loginAction,
    null,
  );

  const [inviteState, inviteFormAction, invitePending] = useActionState<LoginState, FormData>(
    claimInviteAction,
    null,
  );

  const isPending = loginPending || invitePending;

  return (
    <>
      <div className="mb-6 flex gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          onClick={() => setTab("login")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "login"
              ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500 hover:text-black dark:hover:text-white"
          }`}
        >
          Login
        </button>
        <button
          onClick={() => setTab("invite")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "invite"
              ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
              : "text-zinc-500 hover:text-black dark:hover:text-white"
          }`}
        >
          Use Invite Code
        </button>
      </div>

      {tab === "login" && (
        <form action={loginFormAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-name" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="login-name"
              name="name"
              required
              className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none ring-0 focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
              placeholder="e.g. Brad"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none ring-0 focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            {isPending ? "Signing in…" : "Sign In"}
          </button>

          {loginState?.error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {loginState.error}
            </div>
          )}
        </form>
      )}

      {tab === "invite" && (
        <form action={inviteFormAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="invite-code" className="text-sm font-medium">
              Invite code
            </label>
            <input
              id="invite-code"
              name="code"
              autoComplete="one-time-code"
              required
              className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none ring-0 focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
              placeholder="e.g. WC-ABCD1234"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-name" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="invite-name"
              name="name"
              required
              className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none ring-0 focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
              placeholder="e.g. Brad"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-password" className="text-sm font-medium">
              Create Password
            </label>
            <input
              id="invite-password"
              name="password"
              type="password"
              required
              className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none ring-0 focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            {isPending ? "Signing in…" : "Claim Invite & Join"}
          </button>

          {inviteState?.error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {inviteState.error}
            </div>
          )}
        </form>
      )}
    </>
  );
}
