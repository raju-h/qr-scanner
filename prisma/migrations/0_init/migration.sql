-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('QR_CODE', 'EAN_13');

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "ScanType" NOT NULL,
    "rawType" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scans_timestamp_idx" ON "scans"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "scans_value_idx" ON "scans"("value");
