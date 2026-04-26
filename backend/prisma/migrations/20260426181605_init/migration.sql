-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "rent" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,
    "grossYield" DOUBLE PRECISION NOT NULL,
    "cashflow" DOUBLE PRECISION NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,
    "suggestedPrice" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "model" TEXT,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_propertyId_key" ON "Analysis"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_propertyId_key" ON "Offer"("propertyId");

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
