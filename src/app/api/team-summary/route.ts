import { NextRequest, NextResponse } from "next/server";
import { MatchStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TeamFormToken, TeamSummary } from "@/lib/team-summary";

export const dynamic = "force-dynamic";

function formTokenForMatch(params: {
  teamId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
}): TeamFormToken {
  const { teamId, homeTeamId, awayTeamId, homeScore, awayScore } = params;
  if (homeScore == null || awayScore == null) return "-";

  const isHome = homeTeamId === teamId;
  const teamScore = isHome ? homeScore : awayScore;
  const opponentScore = isHome ? awayScore : homeScore;

  if (teamScore > opponentScore) return "W";
  if (teamScore < opponentScore) return "L";
  return "D";
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamId = request.nextUrl.searchParams.get("teamId");
  const name = request.nextUrl.searchParams.get("name");

  if (!teamId && !name) {
    return NextResponse.json({ error: "Missing team identifier" }, { status: 400 });
  }

  const team = await prisma.team.findFirst({
    where: teamId ? { id: teamId } : { name: name ?? "" },
    select: {
      id: true,
      name: true,
      userTeams: {
        select: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const matches = await prisma.match.findMany({
    where: {
      status: MatchStatus.FINAL,
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    orderBy: { kickoffAt: "asc" },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
    },
    take: 500,
  });

  const goalsScored = matches.reduce((total, match) => {
    if (match.homeTeamId === team.id) return total + (match.homeScore ?? 0);
    if (match.awayTeamId === team.id) return total + (match.awayScore ?? 0);
    return total;
  }, 0);

  const recentForm = matches
    .slice(-3)
    .map((match) =>
      formTokenForMatch({
        teamId: team.id,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      }),
    );

  const form: TeamFormToken[] = [
    ...Array.from({ length: Math.max(0, 3 - recentForm.length) }, () => "-" as const),
    ...recentForm,
  ];

  const summary: TeamSummary = {
    teamId: team.id,
    teamName: team.name,
    assignedPlayers: team.userTeams.map((entry) => entry.user.name).sort((a, b) => a.localeCompare(b)),
    form,
    goalsScored,
  };

  return NextResponse.json(summary);
}
