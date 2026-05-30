-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE INDEX "bookings_orderId_idx" ON "bookings"("orderId");
