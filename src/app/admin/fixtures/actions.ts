"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MatchStage, MatchStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export type FixtureState = { error: string } | null;

export async function createFixtureAction(
  _prev: FixtureState,
  formData: FormData,
): Promise<FixtureState> {
  await requireAdmin();
  const homeTeamId = String(formData.get("homeTeamId") ?? "");
  const awayTeamId = String(formData.get("awayTeamId") ?? "");
  const kickoffAtRaw = String(formData.get("kickoffAt") ?? "");
  const stageRaw = String(formData.get("stage") ?? "");
  const groupCode = String(formData.get("groupCode") ?? "").trim();

  if (!homeTeamId || !awayTeamId || !kickoffAtRaw || !stageRaw) {
    return { error: "All fields are required" };
  }
  if (homeTeamId === awayTeamId) {
    return { error: "Home and away teams must be different" };
  }

  const kickoffAt = new Date(kickoffAtRaw);
  if (kickoffAt.toString() === "Invalid Date") {
    return { error: "Invalid kickoff date" };
  }

  await prisma.match.create({
    data: {
      homeTeamId,
      awayTeamId,
      kickoffAt,
      stage: stageRaw as MatchStage,
      groupCode: groupCode || null,
      status: MatchStatus.SCHEDULED,
    },
  });

  revalidatePath("/admin/fixtures");
  return null;
}
