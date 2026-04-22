import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MatchStage, MatchStatus } from "@prisma/client";
import { TeamName } from "@/app/components/TeamName";

export const dynamic = "force-dynamic";

type Row = {
  teamId: string;
  teamName: string;
  flagCode: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

function ensureRow(
  map: Map<string, Row>,
  team: { id: string; name: string; flagCode: string | null },
): Row {
  const existing = map.get(team.id);
  if (existing) return existing;
  const created: Row = {
    teamId: team.id,
    teamName: team.name,
    flagCode: team.flagCode,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
  };
  map.set(team.id, created);
  return created;
}

function finalizeRow(r: Row) {
  r.gd = r.gf - r.ga;
}

function compareRows(a: Row, b: Row) {
  if (b.pts !== a.pts) return b.pts - a.pts;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.teamName.localeCompare(b.teamName);
}

export default async function GroupsPage() {
  await requireUser();

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

  // Seed groups with teams, even before any matches are final.
  const groupToRows = new Map<string, Map<string, Row>>();
  for (const t of teams) {
    const g = t.groupCode ?? "";
    if (!g) continue;
    const rowMap = groupToRows.get(g) ?? new Map<string, Row>();
    groupToRows.set(g, rowMap);
    ensureRow(rowMap, { id: t.id, name: t.name, flagCode: t.flagCode });
  }

  for (const m of matches) {
    // Prefer explicit match.groupCode; fall back to team groupCode.
    const g =
      (m.groupCode ?? m.homeTeam?.groupCode ?? m.awayTeam?.groupCode) ?? "";
    if (!g) continue;
    if (m.homeScore == null || m.awayScore == null) continue;

    const rowMap = groupToRows.get(g) ?? new Map<string, Row>();
    groupToRows.set(g, rowMap);

    if (!m.homeTeamId || !m.awayTeamId || !m.homeTeam || !m.awayTeam) continue;
    const home = ensureRow(rowMap, {
      id: m.homeTeamId,
      name: m.homeTeam.name,
      flagCode: m.homeTeam.flagCode,
    });
    const away = ensureRow(rowMap, {
      id: m.awayTeamId,
      name: m.awayTeam.name,
      flagCode: m.awayTeam.flagCode,
    });

    home.played += 1;
    away.played += 1;

    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.pts += 3;
      away.lost += 1;
    } else if (m.homeScore < m.awayScore) {
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

  const groups = Array.from(groupToRows.entries())
    .map(([groupCode, rowMap]) => {
      const rows = Array.from(rowMap.values());
      for (const r of rows) finalizeRow(r);
      rows.sort(compareRows);
      return { groupCode, rows };
    })
    .sort((a, b) => a.groupCode.localeCompare(b.groupCode));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Groups</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tables are computed from finalized group-stage results.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
        >
          Home
        </Link>
      </div>

      <div className="mt-8 grid gap-6">
        {groups.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
            No groups yet. Add teams with a group letter (A–H) in Admin → Users.
          </div>
        ) : (
          groups.map((g) => (
            <div
              key={g.groupCode}
              className="overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
            >
              <div className="border-b border-black/10 px-5 py-3 text-sm font-medium dark:border-white/10">
                Group {g.groupCode}
              </div>

              <div className="grid grid-cols-[1fr_36px_36px_36px_36px_44px_44px_44px_44px] gap-2 border-b border-black/10 px-5 py-3 text-[11px] font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                <div>Team</div>
                <div className="text-right">P</div>
                <div className="text-right">W</div>
                <div className="text-right">D</div>
                <div className="text-right">L</div>
                <div className="text-right">GF</div>
                <div className="text-right">GA</div>
                <div className="text-right">GD</div>
                <div className="text-right">Pts</div>
              </div>

              <div className="divide-y divide-black/10 dark:divide-white/10">
                {g.rows.map((r) => (
                  <div
                    key={r.teamId}
                    className="grid grid-cols-[1fr_36px_36px_36px_36px_44px_44px_44px_44px] gap-2 px-5 py-3 text-sm"
                  >
                    <div className="min-w-0 font-medium">
                      <TeamName name={r.teamName} flagCode={r.flagCode} />
                    </div>
                    <div className="text-right tabular-nums">{r.played}</div>
                    <div className="text-right tabular-nums">{r.won}</div>
                    <div className="text-right tabular-nums">{r.drawn}</div>
                    <div className="text-right tabular-nums">{r.lost}</div>
                    <div className="text-right tabular-nums">{r.gf}</div>
                    <div className="text-right tabular-nums">{r.ga}</div>
                    <div className="text-right tabular-nums">
                      {r.gd > 0 ? `+${r.gd}` : r.gd}
                    </div>
                    <div className="text-right tabular-nums font-semibold">
                      {r.pts}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 text-xs text-zinc-600 dark:text-zinc-400">
                Tie-break: Pts → GD → GF.
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
