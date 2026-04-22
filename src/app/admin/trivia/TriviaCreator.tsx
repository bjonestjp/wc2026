"use client";

import { useActionState } from "react";
import {
  createTriviaQuestionAction,
  type CreateTriviaState,
} from "./actions";

export function TriviaCreator() {
  const [state, action, pending] = useActionState<CreateTriviaState | null, FormData>(
    createTriviaQuestionAction,
    null,
  );

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="text-sm font-medium">Create trivia question</div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Questions are queued one per day in Eastern time.
      </p>

      <form action={action} className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Question</span>
          <textarea
            name="prompt"
            required
            rows={3}
            className="rounded-xl border border-black/10 bg-transparent px-3 py-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            placeholder="Which country won the 1994 World Cup?"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Answer A</span>
            <input
              name="optionA"
              required
              className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Answer B</span>
            <input
              name="optionB"
              required
              className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Answer C</span>
            <input
              name="optionC"
              required
              className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Answer D</span>
            <input
              name="optionD"
              required
              className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/25"
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-sm sm:max-w-xs">
          <span className="font-medium">Trivia set</span>
          <select
            name="triviaSet"
            required
            defaultValue="REAL"
            className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
          >
            <option value="REAL">REAL</option>
            <option value="TEST">TEST</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-sm sm:max-w-xs">
          <span className="font-medium">Correct answer</span>
          <select
            name="correctOption"
            required
            defaultValue=""
            className="h-11 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none dark:border-white/10"
          >
            <option value="" disabled>
              Select answer
            </option>
            <option value="1">A</option>
            <option value="2">B</option>
            <option value="3">C</option>
            <option value="4">D</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          {pending ? "Adding…" : "Add to trivia queue"}
        </button>
      </form>

      {state?.ok === false ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </div>
      ) : null}

      {state?.ok === true ? (
        <div className="mt-4 rounded-xl border border-black/10 bg-black/[.02] p-3 text-sm dark:border-white/10 dark:bg-white/5">
          Scheduled in <span className="font-medium">{state.triviaSet}</span> for{" "}
          <span className="font-medium">{state.publishOn}</span> Eastern.
        </div>
      ) : null}
    </div>
  );
}
