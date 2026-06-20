-- CreateEnum
CREATE TYPE "FinancingPartnerType" AS ENUM ('BANK', 'SPARKASSE', 'VOLKSBANK', 'VERMITTLER', 'SPEZIALFINANZIERER', 'DEBT_FONDS');

-- CreateTable
CREATE TABLE "FinancingPartner" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancingPartnerType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assetTypes" "AssetType"[] DEFAULT ARRAY[]::"AssetType"[],
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minVolume" INTEGER,
    "maxVolume" INTEGER,
    "maxLtv" DOUBLE PRECISION,
    "investorTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "note" TEXT,

    CONSTRAINT "FinancingPartner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancingPartner_active_type_idx" ON "FinancingPartner"("active", "type");
