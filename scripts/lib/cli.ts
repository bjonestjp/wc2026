export function getArg(name: string): string | null {
  const prefix = `--${name}=`;
  const exact = process.argv.find((arg) => arg.startsWith(prefix));
  if (exact) return exact.slice(prefix.length);

  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0) return process.argv[index + 1] ?? null;
  return null;
}

export function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function requireArg(name: string): string {
  const value = getArg(name);
  if (!value) throw new Error(`Missing required argument --${name}`);
  return value;
}
