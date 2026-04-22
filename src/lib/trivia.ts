import "server-only";

import { prisma } from "@/lib/prisma";

export const TRIVIA_TIME_ZONE = "America/New_York";
export const DEFAULT_TRIVIA_SET = "REAL";

export type TriviaOption = {
  index: number;
  label: string;
  text: string;
};

export type TriviaLeaderboardRow = {
  userId: string;
  name: string;
  pointsTotal: number;
  correctCount: number;
};

export async function getAppConfig() {
  return prisma.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, activeTriviaSet: DEFAULT_TRIVIA_SET },
  });
}

export async function getActiveTriviaSet() {
  const config = await getAppConfig();
  return config.activeTriviaSet;
}

export function getTriviaDateKey(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TRIVIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

export function shiftTriviaDateKey(dateKey: string, days: number): string {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function getYesterdayTriviaDateKey(date = new Date()): string {
  return shiftTriviaDateKey(getTriviaDateKey(date), -1);
}

export function getTriviaOptions(question: {
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}): TriviaOption[] {
  return [
    { index: 1, label: "A", text: question.optionA },
    { index: 2, label: "B", text: question.optionB },
    { index: 3, label: "C", text: question.optionC },
    { index: 4, label: "D", text: question.optionD },
  ];
}

export async function getTodayTriviaQuestion() {
  const triviaSet = await getActiveTriviaSet();
  return prisma.triviaQuestion.findUnique({
    where: {
      triviaSet_publishOn: {
        triviaSet,
        publishOn: getTriviaDateKey(),
      },
    },
  });
}

export async function getYesterdayTriviaQuestion() {
  const triviaSet = await getActiveTriviaSet();
  return prisma.triviaQuestion.findUnique({
    where: {
      triviaSet_publishOn: {
        triviaSet,
        publishOn: getYesterdayTriviaDateKey(),
      },
    },
  });
}

export async function getTriviaLeaderboardRows(): Promise<TriviaLeaderboardRow[]> {
  const triviaSet = await getActiveTriviaSet();
  const [users, grouped] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    }),
    prisma.triviaAnswer.groupBy({
      by: ["userId"],
      where: { question: { triviaSet } },
      _sum: { pointsAwarded: true },
      _count: { _all: true },
    }),
  ]);

  const groupedByUserId = new Map(
    grouped.map((row) => [
      row.userId,
      {
        pointsTotal: row._sum.pointsAwarded ?? 0,
        correctCount: row._sum.pointsAwarded ?? 0,
      },
    ]),
  );

  return users
    .map((user) => {
      const totals = groupedByUserId.get(user.id);
      return {
        userId: user.id,
        name: user.name,
        pointsTotal: totals?.pointsTotal ?? 0,
        correctCount: totals?.correctCount ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.pointsTotal !== a.pointsTotal) return b.pointsTotal - a.pointsTotal;
      return a.name.localeCompare(b.name);
    });
}

export async function getPreviousTriviaBreakdown() {
  const question = await getYesterdayTriviaQuestion();
  if (!question) return null;

  const answers = await prisma.triviaAnswer.findMany({
    where: { questionId: question.id },
    select: { selectedOption: true },
  });

  const totalAnswers = answers.length;
  const counts = new Map<number, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ]);

  for (const answer of answers) {
    counts.set(answer.selectedOption, (counts.get(answer.selectedOption) ?? 0) + 1);
  }

  return {
    question,
    totalAnswers,
    options: getTriviaOptions(question).map((option) => {
      const count = counts.get(option.index) ?? 0;
      return {
        ...option,
        count,
        percentage: totalAnswers === 0 ? 0 : Math.round((count / totalAnswers) * 100),
        isCorrect: option.index === question.correctOption,
      };
    }),
  };
}

export async function getNextTriviaPublishOn(triviaSet: string) {
  const latest = await prisma.triviaQuestion.findFirst({
    where: { triviaSet },
    orderBy: { publishOn: "desc" },
    select: { publishOn: true },
  });

  if (!latest) return getTriviaDateKey();
  return shiftTriviaDateKey(latest.publishOn, 1);
}

export async function reorderTriviaQuestion(questionId: string, direction: "up" | "down") {
  const todayKey = getTriviaDateKey();
  const question = await prisma.triviaQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, publishOn: true, triviaSet: true },
  });
  if (!question) throw new Error("Question not found");
  if (question.publishOn <= todayKey) {
    throw new Error("Only upcoming trivia questions can be reordered");
  }

  const neighbor = await prisma.triviaQuestion.findFirst({
    where:
      direction === "up"
        ? {
            triviaSet: question.triviaSet,
            publishOn: { lt: question.publishOn, gt: todayKey },
          }
        : {
            triviaSet: question.triviaSet,
            publishOn: { gt: question.publishOn },
          },
    orderBy: { publishOn: direction === "up" ? "desc" : "asc" },
    select: { id: true, publishOn: true },
  });

  if (!neighbor) return;

  await prisma.$transaction([
    prisma.triviaQuestion.update({
      where: { id: question.id },
      data: { publishOn: `__temp__${Date.now()}` },
    }),
    prisma.triviaQuestion.update({
      where: { id: neighbor.id },
      data: { publishOn: question.publishOn },
    }),
    prisma.triviaQuestion.update({
      where: { id: question.id },
      data: { publishOn: neighbor.publishOn },
    }),
  ]);
}
