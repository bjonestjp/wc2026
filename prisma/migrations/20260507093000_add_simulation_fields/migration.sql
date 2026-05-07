-- AlterTable
ALTER TABLE "AppConfig"
ADD COLUMN "simulationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "simulationSeed" TEXT;

-- AlterTable
ALTER TABLE "Match"
ADD COLUMN "simulationApplyAt" TIMESTAMP(3),
ADD COLUMN "simulationHomeScore" INTEGER,
ADD COLUMN "simulationAwayScore" INTEGER,
ADD COLUMN "simulationHomePenalties" INTEGER,
ADD COLUMN "simulationAwayPenalties" INTEGER;

-- CreateIndex
CREATE INDEX "Match_simulationApplyAt_idx" ON "Match"("simulationApplyAt");
