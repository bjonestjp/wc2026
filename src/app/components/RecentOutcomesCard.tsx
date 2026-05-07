"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PickSelection } from "@prisma/client";
import { InlineMatchScore } from "@/app/components/InlineMatchScore";
import { LocalTime } from "@/app/components/LocalTime";
import { outcomeFromScore } from "@/lib/scoring-logic";

type RecentOutcomeItem = {
  id: string;
  kickoffAtIso: string;
  updatedAtIso: string;
  homeTeam: {
    id?: string | null;
    name?: string | null;
    flagCode?: string | null;
  };
  awayTeam: {
    id?: string | null;
    name?: string | null;
    flagCode?: string | null;
  };
  homeScore: number | null;
  awayScore: number | null;
  userPick: PickSelection | null;
};

type Props = {
  userId: string;
  outcomes: RecentOutcomeItem[];
};

type RevealPhase = "loading" | "content" | "intro-start" | "prompt" | "reveal";

const REVEAL_DURATION_MS = 800;

function storageKeyForUser(userId: string) {
  return `wc_recent_outcomes_seen_at:v2:${userId}`;
}

function resultMessage(params: {
  userPick: PickSelection | null;
  actualResult: PickSelection;
}) {
  if (!params.userPick) return "No pick submitted.";
  if (params.userPick === params.actualResult) return "You picked correctly.";
  return "You picked incorrectly.";
}

function resultClassName(params: {
  userPick: PickSelection | null;
  actualResult: PickSelection;
}) {
  if (!params.userPick) return "text-zinc-600 dark:text-zinc-400";
  if (params.userPick === params.actualResult) return "text-emerald-700 dark:text-emerald-300";
  return "text-red-700 dark:text-red-300";
}

function FootballMarker() {
  return (
    <span className="absolute right-[-0.8rem] top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
      <span className="h-2.5 w-2.5 rounded-full bg-black dark:bg-white" />
    </span>
  );
}

export function RecentOutcomesCard({ userId, outcomes }: Props) {
  const [phase, setPhase] = useState<RevealPhase>("loading");
  const [reducedMotion, setReducedMotion] = useState(false);
  const latestResultAt = outcomes[0]?.updatedAtIso ?? null;

  useEffect(() => {
    if (!latestResultAt) {
      setPhase("content");
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prefersReduced = mediaQuery.matches;
    setReducedMotion(prefersReduced);

    const seenAt = window.localStorage.getItem(storageKeyForUser(userId));
    const hasUnseenResults = !seenAt || seenAt < latestResultAt;

    if (!hasUnseenResults) {
      setPhase("content");
      return;
    }

    if (prefersReduced) {
      setPhase("prompt");
      return;
    }

    setPhase("intro-start");
    const frame = window.requestAnimationFrame(() => {
      setPhase("prompt");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [latestResultAt, userId]);

  const revealLatestResults = () => {
    if (!latestResultAt) return;

    if (reducedMotion) {
      window.localStorage.setItem(storageKeyForUser(userId), latestResultAt);
      setPhase("content");
      return;
    }

    setPhase("reveal");
    window.setTimeout(() => {
      window.localStorage.setItem(storageKeyForUser(userId), latestResultAt);
      setPhase("content");
    }, REVEAL_DURATION_MS);
  };

  const showingPrompt = phase !== "content" && phase !== "loading";
  const isLoading = phase === "loading";
  const overlayTranslateClass =
    phase === "intro-start" ? "-translate-x-full" : phase === "reveal" ? "translate-x-full" : "translate-x-0";

  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div
        className={
          isLoading
            ? "pointer-events-none select-none opacity-0"
            : showingPrompt
              ? "pointer-events-none select-none opacity-10 blur-[1px]"
              : ""
        }
      >
        <div className="text-sm font-medium">Recent outcomes</div>
        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Latest completed matches across the tournament.
        </div>

        {outcomes.length === 0 ? (
          <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">No completed matches yet.</div>
        ) : (
          <>
            <div className="mt-4 space-y-4">
              {outcomes.map((match) => {
                const actualResult = outcomeFromScore(match.homeScore ?? 0, match.awayScore ?? 0);
                return (
                  <div
                    key={match.id}
                    className="rounded-xl border border-black/10 bg-black/[.02] px-4 py-3 dark:border-white/10 dark:bg-white/[.03]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">
                        <InlineMatchScore
                          homeTeam={match.homeTeam}
                          awayTeam={match.awayTeam}
                          homeScore={match.homeScore}
                          awayScore={match.awayScore}
                        />
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        <LocalTime date={match.kickoffAtIso} short />
                      </div>
                    </div>
                    <div
                      className={[
                        "mt-2 text-sm",
                        resultClassName({ userPick: match.userPick, actualResult }),
                      ].join(" ")}
                    >
                      {resultMessage({ userPick: match.userPick, actualResult })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <Link
                href="/results"
                className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
              >
                See more results
              </Link>
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="absolute inset-0 rounded-2xl bg-white dark:bg-zinc-950" />
      ) : null}

      {showingPrompt ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div
            className={[
              "absolute inset-0 border-b border-emerald-700/20 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white transition-transform ease-in-out dark:border-emerald-300/20",
              overlayTranslateClass,
              reducedMotion ? "duration-150" : phase === "reveal" ? "duration-[800ms]" : "duration-[700ms]",
            ].join(" ")}
          >
            {phase === "reveal" ? <FootballMarker /> : null}
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="max-w-sm text-balance text-lg font-semibold tracking-tight">
                Fresh results are in.
              </div>
              <p className="mt-2 max-w-md text-sm text-emerald-50/90">
                Catch up on what happened since your last visit.
              </p>
              {phase === "prompt" ? (
                <button
                  type="button"
                  onClick={revealLatestResults}
                  className="pointer-events-auto mt-5 rounded-full border border-white/20 bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-50"
                >
                  See latest results
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
