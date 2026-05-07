import { TeamName } from "@/app/components/TeamName";

type TeamShape = {
  id?: string | null;
  name?: string | null;
  flagCode?: string | null;
};

type Props = {
  homeTeam: TeamShape;
  awayTeam: TeamShape;
  homeScore: number | string | null;
  awayScore: number | string | null;
  className?: string;
  scoreClassName?: string;
  interactive?: boolean;
};

export function InlineMatchScore({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  className,
  scoreClassName,
  interactive = true,
}: Props) {
  return (
    <span className={["inline-flex flex-wrap items-center gap-2", className ?? ""].join(" ").trim()}>
      <TeamName
        teamId={homeTeam.id}
        name={homeTeam.name}
        flagCode={homeTeam.flagCode}
        interactive={interactive}
      />
      <span className={scoreClassName ?? "text-base font-semibold text-zinc-500 dark:text-zinc-400"}>
        ({homeScore ?? "—"})
      </span>
      <span>vs</span>
      <TeamName
        teamId={awayTeam.id}
        name={awayTeam.name}
        flagCode={awayTeam.flagCode}
        interactive={interactive}
      />
      <span className={scoreClassName ?? "text-base font-semibold text-zinc-500 dark:text-zinc-400"}>
        ({awayScore ?? "—"})
      </span>
    </span>
  );
}
