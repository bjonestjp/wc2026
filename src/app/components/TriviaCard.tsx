"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  submitTriviaAnswerAction,
  type SubmitTriviaState,
} from "@/app/trivia/actions";
import type { TriviaOption } from "@/lib/trivia";

type Props = {
  questionId: string;
  prompt: string;
  options: TriviaOption[];
  initialState: SubmitTriviaState | null;
  triviaPoints: number;
  triviaPosition: number | null;
  hasYesterdayBreakdown: boolean;
};

export function TriviaCard({
  questionId,
  prompt,
  options,
  initialState,
  triviaPoints,
  triviaPosition,
  hasYesterdayBreakdown,
}: Props) {
  const [state, action, pending] = useActionState<SubmitTriviaState | null, FormData>(
    submitTriviaAnswerAction,
    initialState,
  );

  const submitted = state?.ok === true;
  const selectedOption = submitted ? state.selectedOption : null;
  const correctOption = submitted ? state.correctOption : null;

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Daily trivia</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            1 point for a correct answer. New question every day in Eastern time.
          </div>
        </div>
        <div className="text-right text-sm text-zinc-600 dark:text-zinc-400">
          <div>
            <span className="font-medium tabular-nums">{triviaPoints}</span> trivia points
          </div>
          {triviaPosition ? (
            <div>
              <span className="font-medium tabular-nums">#{triviaPosition}</span> on the trivia board
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 text-base font-medium">{prompt}</div>

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="questionId" value={questionId} />

        {options.map((option) => {
          const isSelected = selectedOption === option.index;
          const isCorrect = correctOption === option.index;

          return (
            <label
              key={option.index}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                submitted && isCorrect
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : submitted && isSelected
                    ? "border-red-500/20 bg-red-500/10"
                    : "border-black/10 bg-transparent dark:border-white/10",
              ].join(" ")}
            >
              <input
                type="radio"
                name="selectedOption"
                value={option.index}
                defaultChecked={isSelected}
                disabled={submitted || pending}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-zinc-700 dark:text-zinc-300">{option.text}</div>
              </div>
            </label>
          );
        })}

        {!submitted ? (
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            {pending ? "Submitting…" : "Submit answer"}
          </button>
        ) : null}
      </form>

      {state?.ok === false ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </div>
      ) : null}

      {state?.ok === true ? (
        <div
          className={[
            "mt-4 rounded-xl border p-3 text-sm",
            state.isCorrect
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          ].join(" ")}
        >
          {state.isCorrect ? "Correct. Nice one." : "Not this time."} The right answer was{" "}
          <span className="font-medium">
            {options.find((option) => option.index === state.correctOption)?.label}
          </span>
          .
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/leaderboard?board=trivia"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Trivia leaderboard
        </Link>
        {hasYesterdayBreakdown ? (
          <Link
            href="/trivia"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
          >
            Yesterday’s answer breakdown
          </Link>
        ) : null}
      </div>
    </div>
  );
}
