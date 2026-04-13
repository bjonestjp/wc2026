"use server";

import { requireAdmin } from "@/lib/auth";
import { autoWireKnockoutBracket } from "@/lib/knockouts";
import { revalidatePath } from "next/cache";

export async function setupKnockoutBracketAction() {
  await requireAdmin();
  await autoWireKnockoutBracket();
  revalidatePath("/knockouts");
  revalidatePath("/admin/knockouts");
}

