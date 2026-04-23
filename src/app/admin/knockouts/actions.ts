"use server";

import { requireAdmin } from "@/lib/auth";
import { autoWireKnockoutBracket, populateRoundOf32FromGroups } from "@/lib/knockouts";
import { revalidatePath } from "next/cache";

export async function setupKnockoutBracketAction() {
  await requireAdmin();
  await autoWireKnockoutBracket();
  revalidatePath("/knockouts");
  revalidatePath("/admin/knockouts");
}

export async function populateRoundOf32Action() {
  await requireAdmin();
  await populateRoundOf32FromGroups();
  revalidatePath("/groups");
  revalidatePath("/fixtures");
  revalidatePath("/results");
  revalidatePath("/knockouts");
  revalidatePath("/admin/results");
  revalidatePath("/admin/knockouts");
}
