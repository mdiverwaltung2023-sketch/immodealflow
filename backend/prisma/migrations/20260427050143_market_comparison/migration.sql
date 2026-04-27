-- CreateEnum
CREATE TYPE "MarketRating" AS ENUM ('below_market', 'fair', 'above_market');

-- CreateTable
CREATE TABLE "MarketComparison" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "rentPerSqmLow" DOUBLE PRECISION NOT NULL,
    "rentPerSqmHigh" DOUBLE PRECISION NOT NULL,
    "pricePerSqmLow" DOUBLE PRECISION NOT NULL,
    "pricePerSqmHigh" DOUBLE PRECISION NOT NULL,
    "rating" "MarketRating" NOT NULL,
    "rationale" TEXT NOT NULL,
    "dataCaveat" TEXT NOT NULL,
    "model" TEXT,

    CONSTRAINT "MarketComparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketComparison_propertyId_key" ON "MarketComparison"("propertyId");

-- AddForeignKey
ALTER TABLE "MarketComparison" ADD CONSTRAINT "MarketComparison_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
