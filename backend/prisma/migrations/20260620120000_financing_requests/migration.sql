-- CreateEnum
CREATE TYPE "FinancingRequestStatus" AS ENUM ('OFFEN', 'IN_VORBEREITUNG', 'BEREIT', 'AN_PARTNER', 'ZUGESAGT', 'ABGELEHNT');

-- CreateTable
CREATE TABLE "FinancingRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "FinancingRequestStatus" NOT NULL DEFAULT 'OFFEN',
    "overall" TEXT,
    "readinessScore" INTEGER,
    "desiredLoanAmount" INTEGER,
    "note" TEXT,

    CONSTRAINT "FinancingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancingRequest_ownerId_status_idx" ON "FinancingRequest"("ownerId", "status");

-- CreateIndex
CREATE INDEX "FinancingRequest_propertyId_idx" ON "FinancingRequest"("propertyId");

-- AddForeignKey
ALTER TABLE "FinancingRequest" ADD CONSTRAINT "FinancingRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancingRequest" ADD CONSTRAINT "FinancingRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
