import "server-only";

import { prisma } from "@/lib/prisma";
import { getScoringConfig, outcomeFromScore, pointsForPick } from "@/lib/scoring";
import { MatchStatus, PickSelection } from "@prisma/client";

export async function recomputeAllUserScores() {
  const config = await getScoringConfig();

  const [users, finalMatches] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.match.findMany({
      where: { status: MatchStatus.FINAL },
      orderBy: { kickoffAt: "asc" },
      select: { id: true, homeScore: true, awayScore: true },
    }),
  ]);

  const matchIds = finalMatches.map((m) => m.id);

  const picks = matchIds.length
    ? await prisma.pick.findMany({
        where: { matchId: { in: matchIds } },
        select: { userId: true, matchId: true, selection: true },
      })
    : [];

  const pickByUserMatch = new Map<string, PickSelection>();
  for (const p of picks) {
    pickByUserMatch.set(`${p.userId}:${p.matchId}`, p.selection);
  }

  await prisma.$transaction(async (tx) => {
    for (const u of users) {
      let pointsTotal = 0;
      let currentStreak = 0;
      let maxStreak = 0;

      for (const m of finalMatches) {
        const key = `${u.id}:${m.id}`;
        const selection = pickByUserMatch.get(key) ?? null;
        const outcome =
          m.homeScore == null || m.awayScore == null
            ? null
            : outcomeFromScore(m.homeScore, m.awayScore);

        let pointsAwarded = 0;

        if (selection && outcome) {
          const isCorrect = selection === outcome;
          const streakAfter = isCorrect ? currentStreak + 1 : 0;
          pointsAwarded = pointsForPick({
            config,
            isCorrect,
            streakAfter,
          });

          currentStreak = streakAfter;
          maxStreak = Math.max(maxStreak, currentStreak);
          pointsTotal += pointsAwarded;

          await tx.scoreEvent.upsert({
            where: { userId_matchId: { userId: u.id, matchId: m.id } },
            create: {
              userId: u.id,
              matchId: m.id,
              pointsAwarded,
              streakAfter: currentStreak,
            },
            update: {
              pointsAwarded,
              streakAfter: currentStreak,
              computedAt: new Date(),
            },
          });
        } else {
          // No pick (or incomplete final score). We still record a 0-point event
          // for idempotency/audit, unless the match has no outcome yet.
          if (outcome) {
            if (config.missedPickBreaksStreak) currentStreak = 0;
            await tx.scoreEvent.upsert({
              where: { userId_matchId: { userId: u.id, matchId: m.id } },
              create: {
                userId: u.id,
                matchId: m.id,
                pointsAwarded: 0,
                streakAfter: currentStreak,
              },
              update: {
                pointsAwarded: 0,
                streakAfter: currentStreak,
                computedAt: new Date(),
              },
            });
          }
        }
      }

      await tx.userScore.upsert({
        where: { userId: u.id },
        create: { userId: u.id, pointsTotal, currentStreak, maxStreak },
        update: { pointsTotal, currentStreak, maxStreak },
      });
    }
  });
}

