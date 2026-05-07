import Link from "next/link";
import { PickSelection } from "@prisma/client";
import { LocalTime } from "@/app/components/LocalTime";
import { TeamName } from "@/app/components/TeamName";

type PreviewMatchState = {
  title: string;
  description: string;
  kickoffAt: string;
  homeTeam: { name: string; flagCode: string };
  awayTeam: { name: string; flagCode: string };
  userPick: PickSelection | null;
  actualResult: PickSelection | null;
  scoreline?: string;
  locked: boolean;
};

const previewStates: PreviewMatchState[] = [
  {
    title: "Upcoming match, no pick yet",
    description: "Baseline state before a player has made a selection.",
    kickoffAt: "2026-05-06T19:30:00.000Z",
    homeTeam: { name: "Mexico", flagCode: "MX" },
    awayTeam: { name: "Japan", flagCode: "JP" },
    userPick: null,
    actualResult: null,
    locked: false,
  },
  {
    title: "Upcoming match, pick submitted",
    description: "Selected state before kickoff, with the match still open.",
    kickoffAt: "2026-05-06T20:00:00.000Z",
    homeTeam: { name: "Brazil", flagCode: "BZ" },
    awayTeam: { name: "Senegal", flagCode: "SN" },
    userPick: PickSelection.HOME,
    actualResult: null,
    locked: false,
  },
  {
    title: "Final result, correct winner",
    description: "The selected side won, so the pick turns green.",
    kickoffAt: "2026-05-06T18:00:00.000Z",
    homeTeam: { name: "England", flagCode: "EN" },
    awayTeam: { name: "Canada", flagCode: "CA" },
    userPick: PickSelection.HOME,
    actualResult: PickSelection.HOME,
    scoreline: "2-1",
    locked: true,
  },
  {
    title: "Final result, wrong winner",
    description: "The chosen side lost, while the actual winner is still called out.",
    kickoffAt: "2026-05-06T17:30:00.000Z",
    homeTeam: { name: "Spain", flagCode: "ES" },
    awayTeam: { name: "Morocco", flagCode: "MR" },
    userPick: PickSelection.HOME,
    actualResult: PickSelection.AWAY,
    scoreline: "0-1",
    locked: true,
  },
  {
    title: "Final result, correct draw",
    description: "Draw picks get the same success treatment when the match finishes level.",
    kickoffAt: "2026-05-06T16:30:00.000Z",
    homeTeam: { name: "USA", flagCode: "US" },
    awayTeam: { name: "South Korea", flagCode: "SK" },
    userPick: PickSelection.DRAW,
    actualResult: PickSelection.DRAW,
    scoreline: "1-1",
    locked: true,
  },
  {
    title: "Final result, no pick submitted",
    description: "A missed pick stays neutral but still shows the actual outcome.",
    kickoffAt: "2026-05-06T15:30:00.000Z",
    homeTeam: { name: "Argentina", flagCode: "AG" },
    awayTeam: { name: "Nigeria", flagCode: "NR" },
    userPick: null,
    actualResult: PickSelection.AWAY,
    scoreline: "1-2",
    locked: true,
  },
];

function labelForSelection(
  selection: PickSelection,
  teams: Pick<PreviewMatchState, "homeTeam" | "awayTeam">,
) {
  if (selection === PickSelection.HOME) {
    return (
      <TeamName
        name={teams.homeTeam.name}
        flagCode={teams.homeTeam.flagCode}
        interactive={false}
      />
    );
  }
  if (selection === PickSelection.AWAY) {
    return (
      <TeamName
        name={teams.awayTeam.name}
        flagCode={teams.awayTeam.flagCode}
        interactive={false}
      />
    );
  }
  return "Draw";
}

function resultSummary(state: PreviewMatchState) {
  if (!state.actualResult) {
    if (state.userPick) return "Your pick is in. We are waiting for the final whistle.";
    return "No pick submitted.";
  }

  if (!state.userPick) return "No pick submitted.";
  if (state.userPick === state.actualResult) return "You picked correctly.";
  return "You picked incorrectly.";
}

function pickPrompt(state: PreviewMatchState) {
  if (state.locked && !state.userPick) return null;
  return state.userPick ? "Your pick:" : "Click to make your selection:";
}

function buttonClassName({
  isSelected,
}: {
  isSelected: boolean;
}) {
  const base =
    "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm transition-colors";

  if (isSelected) {
    return `${base} border-black bg-black text-white dark:border-white dark:bg-white dark:text-black`;
  }
  return `${base} border-black/10 dark:border-white/10`;
}

function statusTextClassName(status: "pending" | "correct" | "incorrect" | "missed") {
  if (status === "correct") return "text-emerald-700 dark:text-emerald-300";
  if (status === "incorrect") return "text-red-700 dark:text-red-300";
  return "text-zinc-600 dark:text-zinc-400";
}

function scoreTokens(state: PreviewMatchState) {
  if (!state.scoreline) return null;
  const [homeScore, awayScore] = state.scoreline.split("-");
  return { homeScore, awayScore };
}

function PreviewCard({ state }: { state: PreviewMatchState }) {
  const status =
    state.actualResult == null
      ? "pending"
      : state.userPick == null
        ? "missed"
        : state.userPick === state.actualResult
          ? "correct"
          : "incorrect";
  const scores = scoreTokens(state);

  const options = [
    { selection: PickSelection.HOME, label: labelForSelection(PickSelection.HOME, state) },
    { selection: PickSelection.DRAW, label: "Draw" },
    { selection: PickSelection.AWAY, label: labelForSelection(PickSelection.AWAY, state) },
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div>
        <div className="text-sm font-medium">{state.title}</div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{state.description}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">
          <span className="inline-flex flex-wrap items-center gap-2">
            <TeamName name={state.homeTeam.name} flagCode={state.homeTeam.flagCode} />
            {scores ? (
              <span className="text-base font-semibold text-zinc-500 dark:text-zinc-400">
                ({scores.homeScore})
              </span>
            ) : null}
            <span>vs</span>
            <TeamName name={state.awayTeam.name} flagCode={state.awayTeam.flagCode} />
            {scores ? (
              <span className="text-base font-semibold text-zinc-500 dark:text-zinc-400">
                ({scores.awayScore})
              </span>
            ) : null}
          </span>
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          <LocalTime date={state.kickoffAt} short />
          {state.locked ? " • Locked" : ""}
        </div>
      </div>

      {pickPrompt(state) ? (
        <div className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {pickPrompt(state)}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {options.map((option) => (
          <span
            key={option.selection}
            className={buttonClassName({ isSelected: state.userPick === option.selection })}
          >
            {option.label}
          </span>
        ))}
      </div>

      <div className={["mt-3 text-center text-xs", statusTextClassName(status)].join(" ")}>
        {resultSummary(state)}
      </div>
    </div>
  );
}

export default function UiPreviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Prediction UI preview</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Mocked pick states for tuning correct and incorrect result feedback without touching
            live fixtures, scores, or user picks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
          >
            Back to admin
          </Link>
          <Link
            href="/fixtures/today"
            className="rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/[.04] dark:border-white/10 dark:hover:bg-white/10"
          >
            Today&apos;s picks
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-black/[.02] p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/[.03] dark:text-zinc-300">
        This page is read-only. It is only for testing the visual language before we wire the same
        feedback into the real picks flow.
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {previewStates.map((state) => (
          <PreviewCard key={state.title} state={state} />
        ))}
      </div>
    </div>
  );
}
