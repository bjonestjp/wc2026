"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SubmitTriviaState =
  | { ok: false; error: string }
  | {
      ok: true;
      selectedOption: number;
      isCorrect: boolean;
      correctOption: number;
    };

export async function submitTriviaAnswerAction(
  _prev: SubmitTriviaState | null,
  formData: FormData,
): Promise<SubmitTriviaState> {
  const user = await requireUser();

  const questionId = String(formData.get("questionId") ?? "");
  const selectedOption = Number(formData.get("selectedOption") ?? "");
  if (!questionId || ![1, 2, 3, 4].includes(selectedOption)) {
    return { ok: false, error: "Choose one answer before submitting" };
  }

  const question = await prisma.triviaQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, correctOption: true },
  });
  if (!question) {
    return { ok: false, error: "Question not found" };
  }

  const existing = await prisma.triviaAnswer.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
    select: {
      selectedOption: true,
      isCorrect: true,
      question: { select: { correctOption: true } },
    },
  });

  if (existing) {
    return {
      ok: true,
      selectedOption: existing.selectedOption,
      isCorrect: existing.isCorrect,
      correctOption: existing.question.correctOption,
    };
  }

  const isCorrect = selectedOption === question.correctOption;

  await prisma.triviaAnswer.create({
    data: {
      userId: user.id,
      questionId,
      selectedOption,
      isCorrect,
      pointsAwarded: isCorrect ? 1 : 0,
    },
  });

  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/trivia");

  return {
    ok: true,
    selectedOption,
    isCorrect,
    correctOption: question.correctOption,
  };
}
