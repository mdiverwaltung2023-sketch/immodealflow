-- AlterTable: Lead-Übergabe an Partner (Opt-in)
ALTER TABLE "FinancingRequest" ADD COLUMN "partnerId" TEXT;
ALTER TABLE "FinancingRequest" ADD COLUMN "handedOffAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "FinancingRequest_partnerId_idx" ON "FinancingRequest"("partnerId");

-- AddForeignKey
ALTER TABLE "FinancingRequest" ADD CONSTRAINT "FinancingRequest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "FinancingPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
