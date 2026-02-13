-- CreateEnum
CREATE TYPE "PropertyFeatureKey" AS ENUM ('WHEELCHAIR', 'CRIB', 'PETS_ALLOWED', 'PARKING', 'REFUND_POLICY', 'WIFI', 'POOL', 'SEA_VIEW', 'AIR_CONDITIONING', 'BBQ', 'HEATING', 'WASHER', 'KITCHEN', 'WORKSPACE');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "areaSqm" INTEGER,
ADD COLUMN     "bathrooms" INTEGER,
ADD COLUMN     "bedrooms" INTEGER,
ADD COLUMN     "checkInFrom" TEXT,
ADD COLUMN     "checkInTo" TEXT,
ADD COLUMN     "checkOutUntil" TEXT,
ADD COLUMN     "cleaningFeeCents" INTEGER,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "minNights" INTEGER,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "weeklyDiscountBps" INTEGER;

-- CreateTable
CREATE TABLE "PropertyFeature" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "key" "PropertyFeatureKey" NOT NULL,
    "sortOrder" INTEGER,

    CONSTRAINT "PropertyFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAmenity" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER,

    CONSTRAINT "PropertyAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPolicy" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER,

    CONSTRAINT "PropertyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyFeature_propertyId_idx" ON "PropertyFeature"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyFeature_propertyId_key_key" ON "PropertyFeature"("propertyId", "key");

-- CreateIndex
CREATE INDEX "PropertyAmenity_propertyId_idx" ON "PropertyAmenity"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyPolicy_propertyId_idx" ON "PropertyPolicy"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyFeature" ADD CONSTRAINT "PropertyFeature_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPolicy" ADD CONSTRAINT "PropertyPolicy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
