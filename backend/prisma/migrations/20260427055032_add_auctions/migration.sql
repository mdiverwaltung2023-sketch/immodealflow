-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('FREE_SALE', 'AUCTION');

-- CreateEnum
CREATE TYPE "AuctionType" AS ENUM ('ZVG', 'DGA', 'SDL', 'KARHAUSEN', 'OTHER');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "dealType" "DealType" NOT NULL DEFAULT 'FREE_SALE';

-- CreateTable
CREATE TABLE "AuctionInfo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "auctionType" "AuctionType" NOT NULL DEFAULT 'ZVG',
    "caseNumber" TEXT,
    "marketValue" INTEGER,
    "auctionDate" TIMESTAMP(3),
    "auctionLocation" TEXT,
    "sourceUrl" TEXT,
    "rawText" TEXT,
    "bidLimit" INTEGER,
    "bidLimitNeutral" INTEGER,
    "notes" TEXT,

    CONSTRAINT "AuctionInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuctionInfo_propertyId_key" ON "AuctionInfo"("propertyId");

-- AddForeignKey
ALTER TABLE "AuctionInfo" ADD CONSTRAINT "AuctionInfo_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
