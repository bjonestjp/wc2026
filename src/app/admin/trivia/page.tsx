import Link from "next/link";
import { TriviaCreator } from "./TriviaCreator";
import { activateTriviaSetAction, moveTriviaQuestionAction } from "./actions";
import { getActiveTriviaSet, getTriviaDateKey, getTriviaOptions } from "@/lib/trivia";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTriviaPage() {
  const todayKey = getTriviaDateKey();
  const [activeTriviaSet, questions] = await Promise.all([
    getActiveTriviaSet(),
    prisma.triviaQuestion.findMany({
      orderBy: [{ triviaSet: "asc" }, { publishOn: "asc" }],
      take: 240,
    }),
  ]);
  const questionsBySet = new Map<string, typeof questions>();
  for (const question of questions) {
    const list = questionsBySet.get(question.triviaSet) ?? [];
    list.push(question);
    questionsBySet.set(question.triviaSet, list);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Trivia</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Queue one multiple-choice question per day. Day boundaries use Eastern time.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Back
        </Link>
      </div>

      <div className="mt-6">
        <TriviaCreator />
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Active trivia set</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              The live app is currently serving <span className="font-medium">{activeTriviaSet}</span>.
            </div>
          </div>
          <div className="flex gap-2">
            {["REAL", "TEST"].map((setName) => (
              <form key={setName} action={activateTriviaSetAction}>
                <input type="hidden" name="triviaSet" value={setName} />
                <button
                  className={[
                    "rounded-xl px-3 py-2 text-sm",
                    activeTriviaSet === setName
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "border border-black/10 hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  Activate {setName}
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        {["REAL", "TEST"].map((setName) => {
          const setQuestions = questionsBySet.get(setName) ?? [];
          return (
            <div key={setName} className="rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
              <div className="border-b border-black/10 px-5 py-3 text-sm font-medium dark:border-white/10">
                {setName} queue
              </div>
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {setQuestions.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-zinc-600 dark:text-zinc-400">
                    No {setName.toLowerCase()} trivia questions queued yet.
                  </div>
                ) : (
                  setQuestions.map((question) => {
              const options = getTriviaOptions(question);
              const isLocked = question.publishOn <= todayKey;

              return (
                <div key={question.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{question.prompt}</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {question.publishOn} Eastern
                        {question.publishOn < todayKey ? " • Past" : null}
                        {question.publishOn === todayKey ? " • Live today" : null}
                        {question.publishOn > todayKey ? " • Upcoming" : null}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {options.map((option) => (
                          <div
                            key={option.index}
                            className={[
                              "rounded-xl border px-3 py-2 text-sm",
                              option.index === question.correctOption
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-black/10 bg-black/[.02] dark:border-white/10 dark:bg-white/5",
                            ].join(" ")}
                          >
                            <span className="font-medium">{option.label}.</span>{" "}
                            {option.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <form action={moveTriviaQuestionAction}>
                        <input type="hidden" name="questionId" value={question.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          disabled={isLocked}
                          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
                        >
                          Move up
                        </button>
                      </form>
                      <form action={moveTriviaQuestionAction}>
                        <input type="hidden" name="questionId" value={question.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          disabled={isLocked}
                          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
                        >
                          Move down
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
