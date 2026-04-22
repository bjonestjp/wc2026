"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createTeamAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const groupCode = String(formData.get("groupCode") ?? "").trim();
  const flagCode = String(formData.get("flagCode") ?? "").trim().toUpperCase();
  if (!name) return;

  await prisma.team.create({
    data: {
      name,
      groupCode: groupCode || null,
      flagCode: flagCode || null,
    },
  });
  revalidatePath("/admin/users");
}

export async function assignTeamAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!userId || !teamId) return;

  await prisma.userTeam.upsert({
    where: { userId_teamId: { userId, teamId } },
    create: { userId, teamId },
    update: {},
  });
  revalidatePath("/admin/users");
}

export async function unassignTeamAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!userId || !teamId) return;

  await prisma.userTeam.delete({
    where: { userId_teamId: { userId, teamId } },
  });
  revalidatePath("/admin/users");
}
