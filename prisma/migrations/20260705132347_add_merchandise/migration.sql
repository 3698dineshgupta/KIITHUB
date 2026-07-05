-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR');

-- CreateEnum
CREATE TYPE "MerchCategory" AS ENUM ('ELECTRONICS', 'BOOKS_NOTES', 'COOKING_APPLIANCES', 'CYCLES', 'FURNITURE', 'CLOTHING', 'SPORTS_FITNESS', 'STATIONERY', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LISTING_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'LISTING_REJECTED';

-- CreateTable
CREATE TABLE "MerchListing" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "MerchCategory" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "condition" "ProductCondition" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "whatsapp" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "awaitingCustomReason" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "telegramMessageId" INTEGER,
    "telegramSent" BOOLEAN NOT NULL DEFAULT false,
    "telegramError" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchImage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchModerationLog" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchSave" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchListing_slug_key" ON "MerchListing"("slug");

-- CreateIndex
CREATE INDEX "MerchListing_sellerId_idx" ON "MerchListing"("sellerId");

-- CreateIndex
CREATE INDEX "MerchListing_status_idx" ON "MerchListing"("status");

-- CreateIndex
CREATE INDEX "MerchListing_category_idx" ON "MerchListing"("category");

-- CreateIndex
CREATE INDEX "MerchListing_createdAt_idx" ON "MerchListing"("createdAt");

-- CreateIndex
CREATE INDEX "MerchImage_listingId_idx" ON "MerchImage"("listingId");

-- CreateIndex
CREATE INDEX "MerchModerationLog_listingId_idx" ON "MerchModerationLog"("listingId");

-- CreateIndex
CREATE INDEX "MerchSave_listingId_idx" ON "MerchSave"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchSave_userId_listingId_key" ON "MerchSave"("userId", "listingId");

-- AddForeignKey
ALTER TABLE "MerchListing" ADD CONSTRAINT "MerchListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchImage" ADD CONSTRAINT "MerchImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MerchListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchModerationLog" ADD CONSTRAINT "MerchModerationLog_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MerchListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchSave" ADD CONSTRAINT "MerchSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchSave" ADD CONSTRAINT "MerchSave_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MerchListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

