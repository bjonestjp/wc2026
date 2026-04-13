-- CreateEnum
CREATE TYPE "KnockoutSlot" AS ENUM ('HOME', 'AWAY');

-- CreateEnum
CREATE TYPE "AdvancementType" AS ENUM ('WINNER', 'LOSER');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "advanceAs" "AdvancementType",
ADD COLUMN     "bracketOrder" INTEGER,
ADD COLUMN     "nextMatchId" TEXT,
ADD COLUMN     "nextSlot" "KnockoutSlot",
ALTER COLUMN "homeTeamId" DROP NOT NULL,
ALTER COLUMN "awayTeamId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Match_bracketOrder_idx" ON "Match"("bracketOrder");

-- CreateIndex
CREATE INDEX "Match_nextMatchId_idx" ON "Match"("nextMatchId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
