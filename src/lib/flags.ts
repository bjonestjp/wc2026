import manifest from "@/generated/flag-manifest.json";

type FlagManifest = Record<string, string>;

const flagManifest = manifest as FlagManifest;

export function normalizeFlagCode(flagCode: string | null | undefined): string | null {
  const normalized = flagCode?.trim().toUpperCase() ?? "";
  return normalized || null;
}

export function getFlagAssetPath(flagCode: string | null | undefined): string | null {
  const normalized = normalizeFlagCode(flagCode);
  if (!normalized) return null;
  return flagManifest[normalized] ?? null;
}
