-- CreateTable
CREATE TABLE "TriviaQuestion" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctOption" INTEGER NOT NULL,
    "publishOn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TriviaQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriviaAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOption" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriviaAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TriviaQuestion_publishOn_key" ON "TriviaQuestion"("publishOn");

-- CreateIndex
CREATE INDEX "TriviaQuestion_publishOn_idx" ON "TriviaQuestion"("publishOn");

-- CreateIndex
CREATE UNIQUE INDEX "TriviaAnswer_userId_questionId_key" ON "TriviaAnswer"("userId", "questionId");

-- CreateIndex
CREATE INDEX "TriviaAnswer_questionId_idx" ON "TriviaAnswer"("questionId");

-- CreateIndex
CREATE INDEX "TriviaAnswer_userId_idx" ON "TriviaAnswer"("userId");

-- AddForeignKey
ALTER TABLE "TriviaAnswer" ADD CONSTRAINT "TriviaAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriviaAnswer" ADD CONSTRAINT "TriviaAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TriviaQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
