-- AlterTable
ALTER TABLE "courts" ADD COLUMN     "afternoonClose" TEXT NOT NULL DEFAULT '22:00',
ADD COLUMN     "afternoonEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "afternoonOpen" TEXT NOT NULL DEFAULT '13:00',
ADD COLUMN     "morningClose" TEXT NOT NULL DEFAULT '12:00',
ADD COLUMN     "morningEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "morningOpen" TEXT NOT NULL DEFAULT '06:00';
