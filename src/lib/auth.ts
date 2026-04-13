import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { sha256Hex } from "@/lib/tokens";

const SESSION_COOKIE_NAME = "wc_session";
const SESSION_TTL_DAYS = 30;

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = sha256Hex(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) redirect("/");
  return user;
}

export async function loginWithInviteCode(params: {
  code: string;
  name: string;
}) {
  const codeTrimmed = params.code.trim();
  const nameTrimmed = params.name.trim();

  if (!codeTrimmed) throw new Error("Invite code is required");
  if (!nameTrimmed) throw new Error("Name is required");

  const tokenHash = sha256Hex(codeTrimmed);

  const invite = await prisma.inviteCode.findUnique({ where: { tokenHash } });
  if (!invite) throw new Error("Invalid code");
  if (invite.usedAt) throw new Error("Code already used");
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) {
    throw new Error("Code expired");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Re-check under transaction to avoid race conditions.
    const inviteLocked = await tx.inviteCode.findUnique({
      where: { tokenHash },
    });
    if (!inviteLocked) throw new Error("Invalid code");
    if (inviteLocked.usedAt) throw new Error("Code already used");
    if (inviteLocked.expiresAt && inviteLocked.expiresAt.getTime() <= Date.now())
      throw new Error("Code expired");

    const user = await tx.user.create({
      data: { name: nameTrimmed },
    });
    await tx.userScore.create({ data: { userId: user.id } });

    await tx.inviteCode.update({
      where: { id: inviteLocked.id },
      data: { usedAt: new Date(), claimedByUserId: user.id },
    });

    const sessionToken = randomBytes(32).toString("hex");
    const session = await tx.session.create({
      data: {
        tokenHash: sha256Hex(sessionToken),
        userId: user.id,
        expiresAt: new Date(
          Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return { user, sessionToken, sessionId: session.id };
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, result.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });

  return { userId: result.user.id };
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  cookieStore.delete(SESSION_COOKIE_NAME);
  if (!token) return;

  const tokenHash = sha256Hex(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: { id: true },
  });
  if (!session) return;
  // best-effort delete; cookie is already gone
  await prisma.session.delete({ where: { id: session.id } });
}

