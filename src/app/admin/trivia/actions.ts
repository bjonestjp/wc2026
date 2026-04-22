"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextTriviaPublishOn, reorderTriviaQuestion } from "@/lib/trivia";

export type CreateTriviaState =
  | { ok: false; error: string }
  | { ok: true; publishOn: string; triviaSet: string };

export async function createTriviaQuestionAction(
  _prev: CreateTriviaState | null,
  formData: FormData,
): Promise<CreateTriviaState> {
  await requireAdmin();

  const prompt = String(formData.get("prompt") ?? "").trim();
  const optionA = String(formData.get("optionA") ?? "").trim();
  const optionB = String(formData.get("optionB") ?? "").trim();
  const optionC = String(formData.get("optionC") ?? "").trim();
  const optionD = String(formData.get("optionD") ?? "").trim();
  const correctOption = Number(formData.get("correctOption") ?? "");
  const triviaSet = String(formData.get("triviaSet") ?? "").trim().toUpperCase();

  if (!prompt || !optionA || !optionB || !optionC || !optionD) {
    return { ok: false, error: "Prompt and all four answers are required" };
  }

  if (![1, 2, 3, 4].includes(correctOption)) {
    return { ok: false, error: "Pick which answer is correct" };
  }
  if (!triviaSet) {
    return { ok: false, error: "Trivia set is required" };
  }

  const publishOn = await getNextTriviaPublishOn(triviaSet);

  await prisma.triviaQuestion.create({
    data: {
      triviaSet,
      prompt,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      publishOn,
    },
  });

  revalidatePath("/admin/trivia");
  revalidatePath("/");
  revalidatePath("/trivia");
  return { ok: true, publishOn, triviaSet };
}

export async function moveTriviaQuestionAction(formData: FormData) {
  await requireAdmin();

  const questionId = String(formData.get("questionId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!questionId || (direction !== "up" && direction !== "down")) return;

  await reorderTriviaQuestion(questionId, direction);

  revalidatePath("/admin/trivia");
  revalidatePath("/");
  revalidatePath("/trivia");
}

export async function activateTriviaSetAction(formData: FormData) {
  await requireAdmin();

  const triviaSet = String(formData.get("triviaSet") ?? "").trim().toUpperCase();
  if (!triviaSet) return;

  await prisma.appConfig.upsert({
    where: { id: 1 },
    update: { activeTriviaSet: triviaSet },
    create: { id: 1, activeTriviaSet: triviaSet },
  });

  revalidatePath("/admin/trivia");
  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/trivia");
}
