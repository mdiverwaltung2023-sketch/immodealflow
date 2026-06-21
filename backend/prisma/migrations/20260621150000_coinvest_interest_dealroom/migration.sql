-- Phase Q2 — Co-Investment: Interessenbekundung + Deal-Room (Chat)
-- Additive Migration. Laeuft via `prisma migrate deploy` beim Railway-Start.

-- CreateEnum
CREATE TYPE "CoInvestInterestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "CoInvestInterest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "status" "CoInvestInterestStatus" NOT NULL DEFAULT 'PENDING',
    "fromNote" TEXT,
    "ownerNote" TEXT,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "CoInvestInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoInvestMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "CoInvestMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_coinvest_interest" ON "CoInvestInterest"("requestId", "fromUserId");

-- CreateIndex
CREATE INDEX "CoInvestInterest_fromUserId_status_idx" ON "CoInvestInterest"("fromUserId", "status");

-- CreateIndex
CREATE INDEX "CoInvestInterest_ownerId_status_idx" ON "CoInvestInterest"("ownerId", "status");

-- CreateIndex
CREATE INDEX "CoInvestMessage_interestId_createdAt_idx" ON "CoInvestMessage"("interestId", "createdAt");

-- AddForeignKey
ALTER TABLE "CoInvestInterest" ADD CONSTRAINT "CoInvestInterest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CoInvestRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoInvestInterest" ADD CONSTRAINT "CoInvestInterest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoInvestInterest" ADD CONSTRAINT "CoInvestInterest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoInvestMessage" ADD CONSTRAINT "CoInvestMessage_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "CoInvestInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoInvestMessage" ADD CONSTRAINT "CoInvestMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
