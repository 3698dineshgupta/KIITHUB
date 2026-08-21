-- AlterTable
ALTER TABLE "PYQ" ADD COLUMN     "isMostExpected" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "PYQ_isMostExpected_idx" ON "PYQ"("isMostExpected");

