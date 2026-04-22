-- CreateTable
CREATE TABLE "AppConfig" (
    "id" INTEGER NOT NULL,
    "activeTriviaSet" TEXT NOT NULL DEFAULT 'REAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "TriviaQuestion" ADD COLUMN "triviaSet" TEXT NOT NULL DEFAULT 'REAL';

-- DropIndex
DROP INDEX "TriviaQuestion_publishOn_key";

-- CreateIndex
CREATE UNIQUE INDEX "TriviaQuestion_triviaSet_publishOn_key" ON "TriviaQuestion"("triviaSet", "publishOn");

-- CreateIndex
CREATE INDEX "TriviaQuestion_triviaSet_publishOn_idx" ON "TriviaQuestion"("triviaSet", "publishOn");

-- Seed singleton config
INSERT INTO "AppConfig" ("id", "activeTriviaSet", "createdAt", "updatedAt")
VALUES (1, 'REAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
