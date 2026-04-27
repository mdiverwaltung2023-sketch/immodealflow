-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('WATCHING', 'INQUIRED', 'NEGOTIATING', 'LOI', 'NOTAR', 'CLOSED', 'REJECTED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "status" "DealStatus" NOT NULL DEFAULT 'WATCHING';

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
