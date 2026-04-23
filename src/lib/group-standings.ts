import "server-only";

import { MatchStage, MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type GroupStandingRow = {
  teamId: string;
  teamName: string;
  flagCode: string | null;
  groupCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

export type GroupTable = {
  groupCode: string;
  rows: GroupStandingRow[];
  finalizedMatchCount: number;
  isComplete: boolean;
};

function ensureRow(
  map: Map<string, GroupStandingRow>,
  params: {
    teamId: string;
    teamName: string;
    flagCode: string | null;
    groupCode: string;
  },
) {
  const existing = map.get(params.teamId);
  if (existing) return existing;

  const row: GroupStandingRow = {
    teamId: params.teamId,
    teamName: params.teamName,
    flagCode: params.flagCode,
    groupCode: params.groupCode,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
  };
  map.set(params.teamId, row);
  return row;
}

function finalizeRow(row: GroupStandingRow) {
  row.gd = row.gf - row.ga;
}

export function compareGroupRows(a: GroupStandingRow, b: GroupStandingRow) {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.teamName.localeCompare(b.teamName);
}

export async function getGroupTables(): Promise<GroupTable[]> {
  const [teams, matches] = await Promise.all([
    prisma.team.findMany({
      where: { groupCode: { not: null } },
      orderBy: [{ groupCode: "asc" }, { name: "asc" }],
      select: { id: true, name: true, groupCode: true, flagCode: true },
    }),
    prisma.match.findMany({
      where: { stage: MatchStage.GROUP, status: MatchStatus.FINAL },
      orderBy: { kickoffAt: "asc" },
      include: { homeTeam: true, awayTeam: true },
      take: 500,
    }),
  ]);

  const groupToRows = new Map<string, Map<string, GroupStandingRow>>();
  const finalizedMatchCounts = new Map<string, number>();

  for (const team of teams) {
    const groupCode = team.groupCode ?? "";
    if (!groupCode) continue;
    const rowMap = groupToRows.get(groupCode) ?? new Map<string, GroupStandingRow>();
    groupToRows.set(groupCode, rowMap);
    ensureRow(rowMap, {
      teamId: team.id,
      teamName: team.name,
      flagCode: team.flagCode,
      groupCode,
    });
  }

  for (const match of matches) {
    const groupCode =
      (match.groupCode ?? match.homeTeam?.groupCode ?? match.awayTeam?.groupCode) ?? "";
    if (!groupCode) continue;
    if (match.homeScore == null || match.awayScore == null) continue;
    if (!match.homeTeamId || !match.awayTeamId || !match.homeTeam || !match.awayTeam) continue;

    const rowMap = groupToRows.get(groupCode) ?? new Map<string, GroupStandingRow>();
    groupToRows.set(groupCode, rowMap);
    finalizedMatchCounts.set(groupCode, (finalizedMatchCounts.get(groupCode) ?? 0) + 1);

    const home = ensureRow(rowMap, {
      teamId: match.homeTeamId,
      teamName: match.homeTeam.name,
      flagCode: match.homeTeam.flagCode,
      groupCode,
    });
    const away = ensureRow(rowMap, {
      teamId: match.awayTeamId,
      teamName: match.awayTeam.name,
      flagCode: match.awayTeam.flagCode,
      groupCode,
    });

    home.played += 1;
    away.played += 1;

    home.gf += match.homeScore;
    home.ga += match.awayScore;
    away.gf += match.awayScore;
    away.ga += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.pts += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.pts += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.pts += 1;
      away.pts += 1;
    }
  }

  return Array.from(groupToRows.entries())
    .map(([groupCode, rowMap]) => {
      const rows = Array.from(rowMap.values());
      rows.forEach(finalizeRow);
      rows.sort(compareGroupRows);
      const finalizedMatchCount = finalizedMatchCounts.get(groupCode) ?? 0;
      return {
        groupCode,
        rows,
        finalizedMatchCount,
        isComplete: finalizedMatchCount >= 6,
      };
    })
    .sort((a, b) => a.groupCode.localeCompare(b.groupCode));
}
