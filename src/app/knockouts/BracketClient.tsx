"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AdvancementType, KnockoutSlot, MatchStage, MatchStatus } from "@prisma/client";
import { TeamName } from "@/app/components/TeamName";

type MatchCard = {
  id: string;
  stage: MatchStage;
  bracketOrder: number | null;
  kickoffAtIso: string;
  status: MatchStatus;
  homeTeamName: string | null;
  homeTeamFlagCode: string | null;
  awayTeamName: string | null;
  awayTeamFlagCode: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
};

type Advancement = {
  fromMatchId: string;
  toMatchId: string;
  toSlot: KnockoutSlot;
  type: AdvancementType;
};

type Props = {
  rounds: Array<{
    stage: MatchStage;
    label: string;
    matches: MatchCard[];
  }>;
  advancements: Advancement[];
};

type Line = { d: string };

function formatKickoff(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export function BracketClient(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [svgSize, setSvgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const matchIds = useMemo(() => {
    const ids: string[] = [];
    for (const r of props.rounds) for (const m of r.matches) ids.push(m.id);
    return ids;
  }, [props.rounds]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const w = el.scrollWidth;
      const h = el.scrollHeight;
      setSvgSize({ w, h });

      const containerRect = el.getBoundingClientRect();

      const rectFor = (matchId: string) => {
        const node = el.querySelector<HTMLElement>(`[data-match-id="${matchId}"]`);
        if (!node) return null;
        const r = node.getBoundingClientRect();
        return {
          left: r.left - containerRect.left + el.scrollLeft,
          top: r.top - containerRect.top + el.scrollTop,
          width: r.width,
          height: r.height,
        };
      };

      const nextSlotAnchor = (toRect: { left: number; top: number; width: number; height: number }, slot: string) => {
        // Anchor to top half for HOME, bottom half for AWAY.
        const y =
          slot === "HOME"
            ? toRect.top + toRect.height * 0.33
            : toRect.top + toRect.height * 0.66;
        return { x: toRect.left, y };
      };

      const newLines: Line[] = [];
      for (const adv of props.advancements) {
        const from = rectFor(adv.fromMatchId);
        const to = rectFor(adv.toMatchId);
        if (!from || !to) continue;

        const startX = from.left + from.width;
        const startY = from.top + from.height / 2;
        const end = nextSlotAnchor(to, adv.toSlot);
        const endX = end.x;
        const endY = end.y;

        const midX = startX + Math.max(24, (endX - startX) / 2);
        // Simple elbow-ish bezier for readability.
        const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        newLines.push({ d });
      }

      setLines(newLines);
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    window.addEventListener("resize", compute);
    el.addEventListener("scroll", compute, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
      el.removeEventListener("scroll", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.advancements, matchIds.join("|")]);

  return (
    <div
      ref={containerRef}
      className="relative mt-8 overflow-x-auto rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950"
    >
      <svg
        className="pointer-events-none absolute left-0 top-0"
        width={svgSize.w}
        height={svgSize.h}
        viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}
      >
        <g stroke="currentColor" className="text-black/20 dark:text-white/20" fill="none">
          {lines.map((l, idx) => (
            <path key={idx} d={l.d} strokeWidth={2} />
          ))}
        </g>
      </svg>

      <div className="relative flex min-w-[980px] gap-4">
        {props.rounds.map((round) => (
          <section key={round.stage} className="w-[260px] shrink-0">
            <div className="sticky top-0 z-10 rounded-xl bg-white/90 px-3 py-2 text-sm font-medium backdrop-blur dark:bg-zinc-950/80">
              {round.label}
            </div>
            <div className="mt-2 grid gap-3">
              {round.matches.length === 0 ? (
                <div className="rounded-xl border border-black/10 bg-black/[.02] px-3 py-3 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                  No matches yet.
                </div>
              ) : (
                round.matches.map((m) => {
                  const hasScore = m.homeScore != null && m.awayScore != null;
                  const hasPens = m.homePenalties != null && m.awayPenalties != null;
                  return (
                    <div
                      key={m.id}
                      data-match-id={m.id}
                      className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-zinc-950"
                    >
                      <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        {formatKickoff(m.kickoffAtIso)}
                      </div>
                      <div className="mt-2 grid gap-1 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 font-medium">
                            <TeamName name={m.homeTeamName} flagCode={m.homeTeamFlagCode} />
                          </span>
                          <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                            {hasScore ? m.homeScore : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 font-medium">
                            <TeamName name={m.awayTeamName} flagCode={m.awayTeamFlagCode} />
                          </span>
                          <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                            {hasScore ? m.awayScore : "—"}
                          </span>
                        </div>
                      </div>
                      {hasPens ? (
                        <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                          Pens:{" "}
                          <span className="tabular-nums font-medium">
                            {m.homePenalties}–{m.awayPenalties}
                          </span>
                        </div>
                      ) : null}
                      <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {m.status}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
