import { getCurrentUser } from "@/lib/auth";
import { RecentOutcomesCard } from "@/app/components/RecentOutcomesCard";
import { TeamName } from "@/app/components/TeamName";
import { TriviaCard } from "@/app/components/TriviaCard";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MatchStage, MatchStatus, UserRole } from "@prisma/client";
import {
  getTodayTriviaQuestion,
  getTriviaLeaderboardRows,
  getTriviaOptions,
  getYesterdayTriviaQuestion,
} from "@/lib/trivia";
import { logoutAction } from "@/app/logout/actions";

export const dynamic = "force-dynamic";

function winnerLoserTeamId(match: {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
}): { winnerTeamId: string; loserTeamId: string } | null {
  if (!match.homeTeamId || !match.awayTeamId) return null;
  if (match.homeScore == null || match.awayScore == null) return null;

  const draw = match.homeScore === match.awayScore;
  const homeWon =
    match.homeScore > match.awayScore ||
    (draw &&
      match.homePenalties != null &&
      match.awayPenalties != null &&
      match.homePenalties > match.awayPenalties);
  const awayWon =
    match.awayScore > match.homeScore ||
    (draw &&
      match.homePenalties != null &&
      match.awayPenalties != null &&
      match.awayPenalties > match.homePenalties);

  if (!homeWon && !awayWon) return null;
  return homeWon
    ? { winnerTeamId: match.homeTeamId, loserTeamId: match.awayTeamId }
    : { winnerTeamId: match.awayTeamId, loserTeamId: match.homeTeamId };
}

export default async function Home() {
  const user = await getCurrentUser();
  const [teams, userScore, leaderboard, todayTriviaQuestion, yesterdayTriviaQuestion, triviaLeaderboard] = user
    ? await Promise.all([
        prisma.userTeam.findMany({
          where: { userId: user.id },
          include: { team: true },
          orderBy: { team: { name: "asc" } },
        }),
        prisma.userScore.findUnique({
          where: { userId: user.id },
          select: { pointsTotal: true },
        }),
        prisma.userScore.findMany({
          orderBy: [{ pointsTotal: "desc" }, { maxStreak: "desc" }],
          select: { userId: true },
          take: 500,
        }),
        getTodayTriviaQuestion(),
        getYesterdayTriviaQuestion(),
        getTriviaLeaderboardRows(),
      ])
    : [[], null, [], null, null, []];

  const pointsTotal = userScore?.pointsTotal ?? 0;
  const leaderboardPosition = user
    ? Math.max(
        1,
        leaderboard.findIndex((r) => r.userId === user.id) + 1,
      )
    : null;
  const triviaRow = user
    ? triviaLeaderboard.find((row) => row.userId === user.id) ?? null
    : null;
  const triviaLeaderboardPosition = user
    ? Math.max(
        1,
        triviaLeaderboard.findIndex((row) => row.userId === user.id) + 1,
      )
    : null;
  const todayTriviaAnswer =
    user && todayTriviaQuestion
      ? await prisma.triviaAnswer.findUnique({
          where: {
            userId_questionId: {
              userId: user.id,
              questionId: todayTriviaQuestion.id,
            },
          },
          select: {
            selectedOption: true,
            isCorrect: true,
          },
        })
      : null;

  const teamIds = teams.map((t) => t.teamId);
  const knockoutResults = user && teamIds.length
    ? await prisma.match.findMany({
        where: {
          status: MatchStatus.FINAL,
          stage: { not: MatchStage.GROUP },
          OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }],
        },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          homePenalties: true,
          awayPenalties: true,
        },
        take: 500,
      })
    : [];
  const recentOutcomes = user
    ? await prisma.match.findMany({
        where: {
          status: MatchStatus.FINAL,
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          picks: {
            where: { userId: user.id },
            select: { selection: true },
            take: 1,
          },
        },
        orderBy: { kickoffAt: "desc" },
        take: 4,
      })
    : [];

  const eliminatedTeamIds = new Set<string>();
  for (const m of knockoutResults) {
    const wl = winnerLoserTeamId(m);
    if (!wl) continue;
    eliminatedTeamIds.add(wl.loserTeamId);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">WC 2026 Pool</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Team draw (primary) + daily picks (optional)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Signed in as <span className="font-medium">{user.name}</span>
              </span>
              {user.role === UserRole.ADMIN ? (
                <Link
                  href="/admin"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
                >
                  Admin
                </Link>
              ) : null}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <Link
              className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              href="/login"
            >
              Enter invite code
            </Link>
          )}
        </div>
      </header>

      <main className="mt-10">
        {user ? (
          <>
            <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-2xl font-semibold tracking-tight">
                    {user.name}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {leaderboardPosition ? (
                      <>
                        <span className="font-medium tabular-nums">
                          {pointsTotal}
                        </span>{" "}
                        points •{" "}
                        <span className="font-medium tabular-nums">
                          #{leaderboardPosition}
                        </span>{" "}
                        on the leaderboard
                      </>
                    ) : (
                      <>
                        <span className="font-medium tabular-nums">
                          {pointsTotal}
                        </span>{" "}
                        points
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-sm font-medium">Your drawn team(s)</div>
                {teams.length === 0 ? (
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    No teams assigned yet. Once the admin enters the draw,
                    they’ll appear here.
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {teams.map((ut) => {
                      const eliminated = eliminatedTeamIds.has(ut.teamId);
                      const statusLabel = eliminated
                        ? "Eliminated"
                        : "In Contention";
                      const statusClasses = eliminated
                        ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
                      return (
                        <Link
                          key={ut.teamId}
                          href={`/teams/${ut.teamId}`}
                          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[.02] px-3 py-1 text-sm hover:bg-black/[.04] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <span className="font-medium">
                            <TeamName teamId={ut.team.id} name={ut.team.name} flagCode={ut.team.flagCode} />
                          </span>
                          {ut.team.groupCode ? (
                            <span className="text-zinc-500 dark:text-zinc-400">
                              Group {ut.team.groupCode}
                            </span>
                          ) : null}
                          <span
                            className={[
                              "ml-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              statusClasses,
                            ].join(" ")}
                          >
                            {statusLabel}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <RecentOutcomesCard
              userId={user.id}
              outcomes={recentOutcomes.map((match) => ({
                id: match.id,
                kickoffAtIso: match.kickoffAt.toISOString(),
                updatedAtIso: match.updatedAt.toISOString(),
                homeTeam: {
                  id: match.homeTeam?.id,
                  name: match.homeTeam?.name,
                  flagCode: match.homeTeam?.flagCode,
                },
                awayTeam: {
                  id: match.awayTeam?.id,
                  name: match.awayTeam?.name,
                  flagCode: match.awayTeam?.flagCode,
                },
                homeScore: match.homeScore,
                awayScore: match.awayScore,
                userPick: match.picks[0]?.selection ?? null,
              }))}
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/fixtures/today"
                className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
              >
                <div className="text-sm font-medium">Today’s picks</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Pick Home / Draw / Away. Locks at kickoff.
                </div>
              </Link>

              <Link
                href="/leaderboard"
                className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
              >
                <div className="text-sm font-medium">Leaderboard</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Points totals + streaks.
                </div>
              </Link>

              <Link
                href="/fixtures"
                className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
              >
                <div className="text-sm font-medium">Fixtures</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Full schedule.
                </div>
              </Link>

              <Link
                href="/results"
                className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
              >
                <div className="text-sm font-medium">Results</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Recent final scores.
                </div>
              </Link>

              <Link
                href="/knockouts"
                className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
              >
                <div className="text-sm font-medium">Knockouts</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Bracket view from the round of 32 onward.
                </div>
              </Link>

              <Link
                href="/groups"
                className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[.02] dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5"
              >
                <div className="text-sm font-medium">Groups</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Tables computed from group-stage results.
                </div>
              </Link>
            </div>

            {todayTriviaQuestion ? (
              <TriviaCard
                questionId={todayTriviaQuestion.id}
                prompt={todayTriviaQuestion.prompt}
                options={getTriviaOptions(todayTriviaQuestion)}
                initialState={
                  todayTriviaAnswer
                    ? {
                        ok: true,
                        selectedOption: todayTriviaAnswer.selectedOption,
                        isCorrect: todayTriviaAnswer.isCorrect,
                        correctOption: todayTriviaQuestion.correctOption,
                      }
                    : null
                }
                triviaPoints={triviaRow?.pointsTotal ?? 0}
                triviaPosition={triviaLeaderboardPosition}
                hasYesterdayBreakdown={Boolean(yesterdayTriviaQuestion)}
              />
            ) : (
              <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
                <div className="text-sm font-medium">Daily trivia</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  No trivia question is queued for today yet.
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <div className="text-sm font-medium">Invite-only</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Enter your invite code to see your team draw and make picks.
            </div>
            <div className="mt-4">
              <Link
                className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                href="/login"
              >
                Enter invite code
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
