import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function generateInviteCode(): string {
  return `WC-${randomBytes(5).toString("hex").toUpperCase()}`;
}

