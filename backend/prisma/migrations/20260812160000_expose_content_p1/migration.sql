-- Phase P1: Exposé — KI-generierter Exposé-Text ("Investment-These").

-- =========================================================
-- CreateEnum: ExposeAudience
-- =========================================================
CREATE TYPE "ExposeAudience" AS ENUM ('AUTO', 'INVESTOR', 'OWNER');

-- =========================================================
-- CreateTable: ExposeContent
-- =========================================================
CREATE TABLE "ExposeContent" (
    "id"           TEXT             NOT NULL,
    "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)     NOT NULL,
    "listingId"    TEXT             NOT NULL,
    "audience"     "ExposeAudience" NOT NULL DEFAULT 'AUTO',
    "headline"     TEXT             NOT NULL,
    "thesis"       TEXT             NOT NULL,
    "strengths"    TEXT[]           DEFAULT ARRAY[]::TEXT[],
    "risks"        TEXT[]           DEFAULT ARRAY[]::TEXT[],
    "locationText" TEXT,
    "callToAction" TEXT,
    "rawJson"      JSONB            NOT NULL,
    "model"        TEXT,

    CONSTRAINT "ExposeContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExposeContent_listingId_key"
    ON "ExposeContent"("listingId");

ALTER TABLE "ExposeContent"
    ADD CONSTRAINT "ExposeContent_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
