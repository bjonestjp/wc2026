"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PickSelection } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type PickState = { error: string } | null;

export async function submitPickAction(
  _prev: PickState,
  formData: FormData,
): Promise<PickState> {
  const user = await requireUser();
  const matchId = String(formData.get("matchId") ?? "");
  const selectionRaw = String(formData.get("selection") ?? "");
  if (!matchId || !selectionRaw) return { error: "Missing selection" };

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { kickoffAt: true },
  });
  if (!match) return { error: "Match not found" };
  if (match.kickoffAt.getTime() <= Date.now()) {
    return { error: "Picks are locked — kickoff has passed" };
  }

  await prisma.pick.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    create: { userId: user.id, matchId, selection: selectionRaw as PickSelection },
    update: { selection: selectionRaw as PickSelection },
  });

  revalidatePath("/fixtures/today");
  return null;
}
