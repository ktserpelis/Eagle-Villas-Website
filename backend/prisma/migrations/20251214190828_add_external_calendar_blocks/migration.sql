-- CreateEnum
CREATE TYPE "ExternalProvider" AS ENUM ('BOOKING_COM');

-- CreateTable
CREATE TABLE "ExternalCalendar" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "icalUrl" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "etag" TEXT,
    "lastModified" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalBlock" (
    "id" SERIAL NOT NULL,
    "calendarId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "externalUid" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualBlock" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendar_propertyId_provider_key" ON "ExternalCalendar"("propertyId", "provider");

-- CreateIndex
CREATE INDEX "ExternalBlock_propertyId_startDate_endDate_idx" ON "ExternalBlock"("propertyId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalBlock_calendarId_externalUid_key" ON "ExternalBlock"("calendarId", "externalUid");

-- CreateIndex
CREATE INDEX "ManualBlock_propertyId_startDate_endDate_idx" ON "ManualBlock"("propertyId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "ExternalCalendar" ADD CONSTRAINT "ExternalCalendar_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalBlock" ADD CONSTRAINT "ExternalBlock_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "ExternalCalendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalBlock" ADD CONSTRAINT "ExternalBlock_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualBlock" ADD CONSTRAINT "ManualBlock_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
