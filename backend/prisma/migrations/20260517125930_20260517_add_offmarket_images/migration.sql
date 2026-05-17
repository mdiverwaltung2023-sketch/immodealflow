-- CreateTable
CREATE TABLE "OffmarketLeadImage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "blurredUrl" TEXT,
    "stylizedUrl" TEXT,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,

    CONSTRAINT "OffmarketLeadImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OffmarketLeadImage_leadId_sortOrder_idx" ON "OffmarketLeadImage"("leadId", "sortOrder");

-- AddForeignKey
ALTER TABLE "OffmarketLeadImage" ADD CONSTRAINT "OffmarketLeadImage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "OffmarketLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
