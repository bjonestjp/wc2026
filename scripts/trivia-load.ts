import { closeDb, prisma } from "./lib/db";
import { getArg, requireArg } from "./lib/cli";
import { readJsonFile, type TriviaFileRow } from "./lib/tournament-files";
import { getTriviaDateKey, shiftTriviaDateKey } from "./lib/tournament-ops";

const DEFAULT_TRIVIA_SET = "REAL";

async function main() {
  const inputPath = requireArg("input");
  const triviaSet = (getArg("set") ?? DEFAULT_TRIVIA_SET).trim().toUpperCase();
  const activate = getArg("activate") !== "false";
  const startOn = getArg("start-on") ?? getTriviaDateKey();

  const rows = await readJsonFile<TriviaFileRow[]>(inputPath);
  if (rows.length === 0) {
    throw new Error("Trivia file is empty");
  }

  await prisma.$transaction(async (tx) => {
    await tx.triviaAnswer.deleteMany({
      where: { question: { triviaSet } },
    });
    await tx.triviaQuestion.deleteMany({ where: { triviaSet } });

    for (const [index, row] of rows.entries()) {
      await tx.triviaQuestion.create({
        data: {
          triviaSet,
          publishOn: shiftTriviaDateKey(startOn, index),
          prompt: row.prompt,
          optionA: row.optionA,
          optionB: row.optionB,
          optionC: row.optionC,
          optionD: row.optionD,
          correctOption: row.correctOption,
        },
      });
    }

    if (activate) {
      await tx.appConfig.upsert({
        where: { id: 1 },
        update: { activeTriviaSet: triviaSet },
        create: { id: 1, activeTriviaSet: triviaSet },
      });
    }
  });

  console.log(`Loaded ${rows.length} trivia questions into ${triviaSet}.`);
  if (activate) {
    console.log(`Activated trivia set ${triviaSet}.`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
