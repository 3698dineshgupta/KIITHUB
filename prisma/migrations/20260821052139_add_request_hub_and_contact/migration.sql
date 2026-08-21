-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FULFILLED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'REQUEST_STATUS_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'REQUEST_FULFILLED';

-- CreateTable
CREATE TABLE "ContentRequest" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "branch" TEXT,
    "semester" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminResponse" TEXT,
    "fulfilledUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ipAddress" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentRequest_requestCode_key" ON "ContentRequest"("requestCode");

-- CreateIndex
CREATE INDEX "ContentRequest_userId_idx" ON "ContentRequest"("userId");

-- CreateIndex
CREATE INDEX "ContentRequest_status_idx" ON "ContentRequest"("status");

-- CreateIndex
CREATE INDEX "ContentRequest_createdAt_idx" ON "ContentRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_respondedAt_idx" ON "ContactMessage"("respondedAt");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "ContentRequest" ADD CONSTRAINT "ContentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

