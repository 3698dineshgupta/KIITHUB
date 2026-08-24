-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SUBMISSION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'SUBMISSION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'UPLOAD_REWARD_GRANTED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "uploadPremiumCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "uploadRewardGrantedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ContentSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentType" "ContentType" NOT NULL DEFAULT 'NOTE',
    "examType" TEXT,
    "academicBranch" TEXT NOT NULL,
    "academicSemester" TEXT NOT NULL,
    "classYear" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "telegramFileId" TEXT NOT NULL,
    "telegramMsgId" TEXT NOT NULL,
    "fileSize" INTEGER,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "publishedType" TEXT,
    "publishedSlug" TEXT,
    "telegramSent" BOOLEAN NOT NULL DEFAULT false,
    "telegramMessageId" INTEGER,
    "telegramError" TEXT,
    "awaitingCustomReason" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadRewardUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noteId" TEXT,
    "pyqId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadRewardUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentSubmission_userId_idx" ON "ContentSubmission"("userId");

-- CreateIndex
CREATE INDEX "ContentSubmission_status_idx" ON "ContentSubmission"("status");

-- CreateIndex
CREATE INDEX "UploadRewardUnlock_userId_idx" ON "UploadRewardUnlock"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadRewardUnlock_userId_noteId_key" ON "UploadRewardUnlock"("userId", "noteId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadRewardUnlock_userId_pyqId_key" ON "UploadRewardUnlock"("userId", "pyqId");

-- AddForeignKey
ALTER TABLE "ContentSubmission" ADD CONSTRAINT "ContentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadRewardUnlock" ADD CONSTRAINT "UploadRewardUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

