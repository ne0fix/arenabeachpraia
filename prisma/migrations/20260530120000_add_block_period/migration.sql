-- CreateEnum
CREATE TYPE "BlockPeriod" AS ENUM ('MORNING', 'AFTERNOON', 'ALL_DAY');

-- AlterTable
ALTER TABLE "court_unavailabilities" ADD COLUMN "period" "BlockPeriod" NOT NULL DEFAULT 'ALL_DAY';

-- CreateIndex
CREATE UNIQUE INDEX "court_unavailabilities_courtId_date_period_key" ON "court_unavailabilities"("courtId", "date", "period");
