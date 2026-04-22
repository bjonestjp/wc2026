import { closeDb, prisma } from "./lib/db";
import { hasFlag } from "./lib/cli";
import { UserRole } from "@prisma/client";

async function main() {
  const keepUsers = hasFlag("keep-users");
  const keepTriviaQuestions = hasFlag("keep-trivia");

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({});
    await tx.inviteCode.deleteMany({});
    await tx.triviaAnswer.deleteMany({});
    if (!keepTriviaQuestions) {
      await tx.triviaQuestion.deleteMany({});
    }

    await tx.userTeam.deleteMany({});
    await tx.pick.deleteMany({});
    await tx.scoreEvent.deleteMany({});
    await tx.userScore.deleteMany({});
    await tx.matchAdvancement.deleteMany({});
    await tx.match.deleteMany({});

    if (!keepUsers) {
      await tx.user.deleteMany({ where: { role: UserRole.USER } });
    }
  });

  console.log("Tournament state reset complete.");
  console.log(`Kept users: ${keepUsers ? "all existing users" : "admins only"}`);
  console.log(`Kept trivia questions: ${keepTriviaQuestions ? "yes" : "no"}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(closeDb);
