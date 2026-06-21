-- Phase Q2.1 — Dokumente im Deal-Room (Teilen erst nach ACCEPTED)
-- Additive Migration. Laeuft via `prisma migrate deploy` beim Railway-Start.

-- CreateTable
CREATE TABLE "CoInvestDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interestId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,

    CONSTRAINT "CoInvestDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoInvestDocument_interestId_createdAt_idx" ON "CoInvestDocument"("interestId", "createdAt");

-- AddForeignKey
ALTER TABLE "CoInvestDocument" ADD CONSTRAINT "CoInvestDocument_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "CoInvestInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoInvestDocument" ADD CONSTRAINT "CoInvestDocument_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
