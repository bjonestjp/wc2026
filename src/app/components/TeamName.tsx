import { FlagIcon } from "@/app/components/FlagIcon";

type Props = {
  name: string | null | undefined;
  flagCode?: string | null;
  href?: string;
  className?: string;
};

export function TeamName({ name, flagCode, className }: Props) {
  const label = name ?? "TBD";

  return (
    <span className={["inline-flex min-w-0 items-center gap-2", className ?? ""].join(" ").trim()}>
      <FlagIcon flagCode={flagCode} teamName={label} />
      <span className="truncate">{label}</span>
    </span>
  );
}
