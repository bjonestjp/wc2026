"use server";

import { prisma } from "@/lib/prisma";
import { generateInviteCode, sha256Hex } from "@/lib/tokens";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type CreateInviteState =
  | { ok: false; error: string }
  | { ok: true; code: string };

export async function createInviteAction(
  _prev: CreateInviteState | null,
  formData: FormData,
): Promise<CreateInviteState> {
  await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  const code = generateInviteCode();
  const tokenHash = sha256Hex(code);

  await prisma.inviteCode.create({
    data: {
      tokenHash,
      label: label || null,
      expiresAt: expiresAt?.toString() === "Invalid Date" ? null : expiresAt,
    },
  });

  revalidatePath("/admin/invites");
  return { ok: true, code };
}

export async function revokeInviteAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.inviteCode.update({
    where: { id },
    data: { usedAt: new Date() },
  });
  revalidatePath("/admin/invites");
}

