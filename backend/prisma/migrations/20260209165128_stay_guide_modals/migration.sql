-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "adults" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "babies" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "children" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StayGuide" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayGuideSection" (
    "id" SERIAL NOT NULL,
    "guideId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayGuideSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayGuideItem" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "href" TEXT,
    "mapsHref" TEXT,
    "mapsEmbedSrc" TEXT,
    "heroImageUrl" TEXT NOT NULL,
    "imageUrls" JSONB,
    "locationLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayGuideItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StayGuide_token_key" ON "StayGuide"("token");

-- CreateIndex
CREATE INDEX "StayGuideSection_guideId_idx" ON "StayGuideSection"("guideId");

-- CreateIndex
CREATE INDEX "StayGuideItem_sectionId_idx" ON "StayGuideItem"("sectionId");

-- AddForeignKey
ALTER TABLE "StayGuideSection" ADD CONSTRAINT "StayGuideSection_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "StayGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayGuideItem" ADD CONSTRAINT "StayGuideItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "StayGuideSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
