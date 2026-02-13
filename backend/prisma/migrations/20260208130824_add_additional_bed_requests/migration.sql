-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "extraBedsCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdditionalBedRequest" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "bedsRequested" INTEGER NOT NULL DEFAULT 1,
    "customerMessage" TEXT,
    "adminMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chargeType" TEXT,
    "amountCents" INTEGER,

    CONSTRAINT "AdditionalBedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdditionalBedRequest_bookingId_idx" ON "AdditionalBedRequest"("bookingId");

-- CreateIndex
CREATE INDEX "AdditionalBedRequest_userId_idx" ON "AdditionalBedRequest"("userId");

-- CreateIndex
CREATE INDEX "AdditionalBedRequest_status_idx" ON "AdditionalBedRequest"("status");

-- AddForeignKey
ALTER TABLE "AdditionalBedRequest" ADD CONSTRAINT "AdditionalBedRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalBedRequest" ADD CONSTRAINT "AdditionalBedRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
