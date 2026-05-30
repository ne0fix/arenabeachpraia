-- DropIndex
DROP INDEX "bookings_accessCode_key";

-- CreateIndex
CREATE INDEX "bookings_accessCode_idx" ON "bookings"("accessCode");
