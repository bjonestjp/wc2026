"use server";

import { loginWithInviteCode } from "@/lib/auth";
import { redirect } from "next/navigation";

export type LoginState = { error: string } | null;

export async function claimInviteAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "");

  try {
    await loginWithInviteCode({ code, name });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }

  redirect("/");
}
