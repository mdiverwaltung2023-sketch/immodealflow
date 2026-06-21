-- Phase Q (Visual): Gesuch-Art (allgemein vs. objektbezogen) + Bild
-- Additive Migration. Laeuft via `prisma migrate deploy` beim Railway-Start.

-- CreateEnum
CREATE TYPE "CoInvestKind" AS ENUM ('GENERAL', 'OBJECT');

-- AlterTable
ALTER TABLE "CoInvestRequest" ADD COLUMN     "kind" "CoInvestKind" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "imageUrl" TEXT;
