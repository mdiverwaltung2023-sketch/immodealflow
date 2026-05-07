-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('MFH', 'COMMERCIAL', 'MIXED_USE', 'SINGLE_FAMILY', 'APARTMENT', 'LAND', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'ON_REQUEST', 'PUBLIC');

-- CreateEnum
CREATE TYPE "TrackrecordRole" AS ENUM ('BUYER', 'SELLER', 'PARTNER', 'BROKER', 'OTHER');

-- CreateTable
CREATE TABLE "InvestorProfile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "investmentExperienceYears" INTEGER NOT NULL DEFAULT 0,
    "equity" INTEGER,
    "monthlyIncome" INTEGER,
    "monthlyDebt" INTEGER,
    "financingPreApproved" BOOLEAN NOT NULL DEFAULT false,
    "financingNote" TEXT,
    "preferredAssetTypes" "AssetType"[] DEFAULT ARRAY[]::"AssetType"[],
    "preferredRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minTicketSize" INTEGER,
    "maxTicketSize" INTEGER,
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',

    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackrecordItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER,
    "location" TEXT NOT NULL,
    "role" "TrackrecordRole" NOT NULL,
    "description" TEXT,
    "verifiedBy" TEXT,

    CONSTRAINT "TrackrecordItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestorProfile_userId_key" ON "InvestorProfile"("userId");

-- CreateIndex
CREATE INDEX "TrackrecordItem_userId_year_idx" ON "TrackrecordItem"("userId", "year");

-- AddForeignKey
ALTER TABLE "InvestorProfile" ADD CONSTRAINT "InvestorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackrecordItem" ADD CONSTRAINT "TrackrecordItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
