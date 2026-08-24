-- AlterTable
ALTER TABLE "ContentSubmission" ADD COLUMN     "duplicateNote" TEXT,
ADD COLUMN     "fileHash" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "fileHash" TEXT;

-- AlterTable
ALTER TABLE "PYQ" ADD COLUMN     "fileHash" TEXT;

-- CreateIndex
CREATE INDEX "ContentSubmission_fileHash_idx" ON "ContentSubmission"("fileHash");

-- CreateIndex
CREATE INDEX "Note_fileHash_idx" ON "Note"("fileHash");

-- CreateIndex
CREATE INDEX "PYQ_fileHash_idx" ON "PYQ"("fileHash");

