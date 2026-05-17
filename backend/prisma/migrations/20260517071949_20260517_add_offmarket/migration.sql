-- CreateEnum
CREATE TYPE "OffmarketLeadStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OffmarketInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- DropIndex
DROP INDEX "RentalApplication_applicantUserId_idx";

-- CreateTable
CREATE TABLE "OffmarketLead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "propertyType" "AssetType" NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "district" TEXT,
    "fullAddress" TEXT,
    "anonymizationLevel" "AnonymizationLevel" NOT NULL DEFAULT 'CITY_ONLY',
    "approxArea" DOUBLE PRECISION NOT NULL,
    "approxPrice" INTEGER NOT NULL,
    "approxRent" INTEGER,
    "description" TEXT NOT NULL,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "OffmarketLeadStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "OffmarketLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffmarketInvite" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "status" "OffmarketInviteStatus" NOT NULL DEFAULT 'PENDING',
    "ownerNote" TEXT,
    "investorNote" TEXT,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "OffmarketInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffmarketMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviteId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "OffmarketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OffmarketLead_ownerId_idx" ON "OffmarketLead"("ownerId");

-- CreateIndex
CREATE INDEX "OffmarketLead_status_idx" ON "OffmarketLead"("status");

-- CreateIndex
CREATE INDEX "OffmarketLead_city_propertyType_idx" ON "OffmarketLead"("city", "propertyType");

-- CreateIndex
CREATE INDEX "OffmarketInvite_investorId_status_idx" ON "OffmarketInvite"("investorId", "status");

-- CreateIndex
CREATE INDEX "OffmarketInvite_ownerId_status_idx" ON "OffmarketInvite"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OffmarketInvite_leadId_investorId_key" ON "OffmarketInvite"("leadId", "investorId");

-- CreateIndex
CREATE INDEX "OffmarketMessage_inviteId_createdAt_idx" ON "OffmarketMessage"("inviteId", "createdAt");

-- AddForeignKey
ALTER TABLE "OffmarketLead" ADD CONSTRAINT "OffmarketLead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffmarketInvite" ADD CONSTRAINT "OffmarketInvite_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "OffmarketLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffmarketInvite" ADD CONSTRAINT "OffmarketInvite_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffmarketInvite" ADD CONSTRAINT "OffmarketInvite_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffmarketMessage" ADD CONSTRAINT "OffmarketMessage_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "OffmarketInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffmarketMessage" ADD CONSTRAINT "OffmarketMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
