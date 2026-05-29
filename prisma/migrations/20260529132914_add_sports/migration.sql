-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "sport" TEXT;

-- AlterTable
ALTER TABLE "courts" ADD COLUMN     "sports" TEXT[] DEFAULT ARRAY[]::TEXT[];
