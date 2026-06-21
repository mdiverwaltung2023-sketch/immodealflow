-- Phase Q — Co-Investment Hub: Gesuch-Modell + Enums
-- Additive Migration. Laeuft via `prisma migrate deploy` beim Railway-Start.

-- CreateEnum
CREATE TYPE "InvestStrategy" AS ENUM ('BUY_AND_HOLD', 'FIX_AND_FLIP', 'PROJECT_DEVELOPMENT', 'VALUE_ADD', 'CASHFLOW', 'OTHER');

-- CreateEnum
CREATE TYPE "CoInvestStatus" AS ENUM ('DRAFT', 'ACTIVE', 'MATCHED', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CoInvestRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assetType" "AssetType",
    "location" TEXT NOT NULL DEFAULT '',
    "purchasePrice" INTEGER,
    "equityAvailable" INTEGER,
    "capitalNeed" INTEGER,
    "strategy" "InvestStrategy",
    "holdingPeriodYears" INTEGER,
    "targetReturnPct" DOUBLE PRECISION,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "CoInvestStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'ON_REQUEST',

    CONSTRAINT "CoInvestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoInvestRequest_ownerId_status_idx" ON "CoInvestRequest"("ownerId", "status");

-- CreateIndex
CREATE INDEX "CoInvestRequest_status_assetType_idx" ON "CoInvestRequest"("status", "assetType");

-- AddForeignKey
ALTER TABLE "CoInvestRequest" ADD CONSTRAINT "CoInvestRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
