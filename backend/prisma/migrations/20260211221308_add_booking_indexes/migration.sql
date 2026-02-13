-- CreateIndex
CREATE INDEX "Booking_createdAt_id_idx" ON "Booking"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_propertyId_createdAt_idx" ON "Booking"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_guestEmail_idx" ON "Booking"("guestEmail");
