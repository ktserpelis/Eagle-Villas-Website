-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingPeriodId" INTEGER,
ADD COLUMN     "priceBreakdown" JSONB,
ADD COLUMN     "weeklyDiscountAppliedBps" INTEGER;

-- CreateTable
CREATE TABLE "BookingPeriod" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "standardNightlyPrice" INTEGER NOT NULL,
    "weeklyDiscountPercentBps" INTEGER,
    "weeklyThresholdNights" INTEGER NOT NULL DEFAULT 7,
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "maxGuests" INTEGER NOT NULL,
    "name" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingPeriod_propertyId_startDate_endDate_idx" ON "BookingPeriod"("propertyId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Booking_propertyId_startDate_endDate_idx" ON "Booking"("propertyId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Booking_bookingPeriodId_idx" ON "Booking"("bookingPeriodId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_bookingPeriodId_fkey" FOREIGN KEY ("bookingPeriodId") REFERENCES "BookingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPeriod" ADD CONSTRAINT "BookingPeriod_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
