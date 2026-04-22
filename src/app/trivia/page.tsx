import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPreviousTriviaBreakdown } from "@/lib/trivia";

export const dynamic = "force-dynamic";

export default async function TriviaResultsPage() {
  await requireUser();

  const breakdown = await getPreviousTriviaBreakdown();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Yesterday’s trivia</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Percentage breakdown of answers after the day changes in Eastern time.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Home
        </Link>
      </div>

      {!breakdown ? (
        <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
          No previous-day trivia results yet.
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Question from {breakdown.question.publishOn} Eastern
          </div>
          <div className="mt-2 text-lg font-medium">{breakdown.question.prompt}</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {breakdown.totalAnswers} total answer{breakdown.totalAnswers === 1 ? "" : "s"}
          </div>

          <div className="mt-6 space-y-3">
            {breakdown.options.map((option) => (
              <div key={option.index}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <div className="font-medium">
                    {option.label}. {option.text}
                    {option.isCorrect ? (
                      <span className="ml-2 text-emerald-700 dark:text-emerald-300">
                        Correct
                      </span>
                    ) : null}
                  </div>
                  <div className="tabular-nums text-zinc-600 dark:text-zinc-400">
                    {option.percentage}% ({option.count})
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                  <div
                    className={[
                      "h-full rounded-full",
                      option.isCorrect ? "bg-emerald-500" : "bg-black/40 dark:bg-white/40",
                    ].join(" ")}
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
