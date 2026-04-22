"use server";

import { loginWithInviteCode, loginWithPassword } from "@/lib/auth";
import { redirect } from "next/navigation";

export type LoginState = { error: string } | null;

export async function claimInviteAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await loginWithInviteCode({ code, name, password });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }

  redirect("/");
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await loginWithPassword({ name, password });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }

  redirect("/");
}
