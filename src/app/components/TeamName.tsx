"use client";

import { useEffect, useMemo, useState } from "react";
import { FlagIcon } from "@/app/components/FlagIcon";
import { useTeamHighlight } from "@/app/components/TeamHighlightProvider";
import type { TeamSummary, TeamFormToken } from "@/lib/team-summary";

type Props = {
  teamId?: string | null;
  name: string | null | undefined;
  flagCode?: string | null;
  href?: string;
  className?: string;
  interactive?: boolean;
};

const teamSummaryCache = new Map<string, TeamSummary | null>();

function formTokenClassName(token: TeamFormToken) {
  if (token === "W") return "text-emerald-600 dark:text-emerald-400";
  if (token === "L") return "text-red-600 dark:text-red-400";
  return "text-zinc-500 dark:text-zinc-400";
}

export function TeamName({
  teamId,
  name,
  flagCode,
  className,
  interactive = true,
}: Props) {
  const label = name ?? "TBD";
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const { highlightedTeamIds, highlightedTeamNames } = useTeamHighlight();
  const isHighlighted =
    (teamId ? highlightedTeamIds.includes(teamId) : false) ||
    (name ? highlightedTeamNames.includes(name) : false);

  const cacheKey = useMemo(() => {
    if (teamId) return `id:${teamId}`;
    if (name) return `name:${name}`;
    return null;
  }, [name, teamId]);

  useEffect(() => {
    if (!open || !interactive || !cacheKey || !name) return;
    if (teamSummaryCache.has(cacheKey)) {
      setSummary(teamSummaryCache.get(cacheKey) ?? null);
      return;
    }

    let active = true;
    setLoading(true);

    const query = teamId
      ? `/api/team-summary?teamId=${encodeURIComponent(teamId)}`
      : `/api/team-summary?name=${encodeURIComponent(name)}`;

    fetch(query, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as TeamSummary;
      })
      .then((data) => {
        if (!active || !cacheKey) return;
        teamSummaryCache.set(cacheKey, data);
        setSummary(data);
      })
      .catch(() => {
        if (!active || !cacheKey) return;
        teamSummaryCache.set(cacheKey, null);
        setSummary(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cacheKey, interactive, name, open, teamId]);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={interactive ? () => setOpen(true) : undefined}
      onMouseLeave={interactive ? () => setOpen(false) : undefined}
      onFocus={interactive ? () => setOpen(true) : undefined}
      onBlur={interactive ? () => setOpen(false) : undefined}
    >
      <span
        className={[
          "inline-flex min-w-0 items-center gap-2 rounded-md",
          interactive && name ? "cursor-help" : "",
          isHighlighted
            ? "bg-amber-500/10 px-1.5 py-0.5 font-semibold text-amber-900 ring-1 ring-amber-500/20 dark:text-amber-200"
            : "",
          className ?? "",
        ].join(" ").trim()}
        tabIndex={interactive && name ? 0 : -1}
      >
        <FlagIcon flagCode={flagCode} teamName={label} />
        <span className="truncate">{label}</span>
      </span>

      {interactive && name && open ? (
        <span className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-0 z-30 w-64 rounded-xl border border-black/10 bg-white p-3 text-left text-xs shadow-lg dark:border-white/10 dark:bg-zinc-950">
          <span className="block text-sm font-medium">{label}</span>
          {loading && !summary ? (
            <span className="mt-2 block text-zinc-600 dark:text-zinc-400">Loading…</span>
          ) : summary ? (
            <span className="mt-2 block space-y-2">
              <span className="block">
                <span className="font-medium">Assigned to:</span>{" "}
                {summary.assignedPlayers.length > 0 ? summary.assignedPlayers.join(", ") : "Unassigned"}
              </span>
              <span className="block">
                <span className="font-medium">Form:</span>{" "}
                <span className="inline-flex items-center gap-1">
                  {summary.form.map((token, index) => (
                    <span key={`${summary.teamId}-${index}`} className={formTokenClassName(token)}>
                      {token}
                    </span>
                  ))}
                </span>
              </span>
              <span className="block">
                <span className="font-medium">Goals scored:</span> {summary.goalsScored}
              </span>
            </span>
          ) : (
            <span className="mt-2 block text-zinc-600 dark:text-zinc-400">
              No quick info available yet.
            </span>
          )}
        </span>
      ) : null}
    </span>
  );
}
