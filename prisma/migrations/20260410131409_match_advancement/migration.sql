/*
  Warnings:

  - You are about to drop the column `advanceAs` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `nextMatchId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `nextSlot` on the `Match` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_nextMatchId_fkey";

-- DropIndex
DROP INDEX "Match_nextMatchId_idx";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "advanceAs",
DROP COLUMN "nextMatchId",
DROP COLUMN "nextSlot";

-- CreateTable
CREATE TABLE "MatchAdvancement" (
    "id" TEXT NOT NULL,
    "fromMatchId" TEXT NOT NULL,
    "toMatchId" TEXT NOT NULL,
    "toSlot" "KnockoutSlot" NOT NULL,
    "type" "AdvancementType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAdvancement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchAdvancement_toMatchId_idx" ON "MatchAdvancement"("toMatchId");

-- CreateIndex
CREATE INDEX "MatchAdvancement_fromMatchId_idx" ON "MatchAdvancement"("fromMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAdvancement_fromMatchId_toMatchId_toSlot_type_key" ON "MatchAdvancement"("fromMatchId", "toMatchId", "toSlot", "type");

-- AddForeignKey
ALTER TABLE "MatchAdvancement" ADD CONSTRAINT "MatchAdvancement_fromMatchId_fkey" FOREIGN KEY ("fromMatchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAdvancement" ADD CONSTRAINT "MatchAdvancement_toMatchId_fkey" FOREIGN KEY ("toMatchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
