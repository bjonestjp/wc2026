import Image from "next/image";
import { getFlagAssetPath } from "@/lib/flags";

type Props = {
  flagCode?: string | null;
  teamName: string;
  className?: string;
};

export function FlagIcon({ flagCode, teamName, className }: Props) {
  const src = getFlagAssetPath(flagCode);
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={`${teamName} flag`}
      width={20}
      height={16}
      className={className ?? "inline-block h-4 w-5 shrink-0 rounded-[2px] object-cover align-[-0.15em]"}
    />
  );
}
