-- Phase K1: KI-Marktanalyse + Angebotsbewertung — Schema.

-- =========================================================
-- CreateEnum: SaleSpeed
-- =========================================================
CREATE TYPE "SaleSpeed" AS ENUM ('FAST', 'NORMAL', 'DIFFICULT');

-- =========================================================
-- CreateEnum: DemandLevel
-- =========================================================
CREATE TYPE "DemandLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- =========================================================
-- CreateEnum: OfferAttractiveness
-- =========================================================
CREATE TYPE "OfferAttractiveness" AS ENUM (
    'SEHR_ATTRAKTIV',
    'MARKTGERECHT',
    'NIEDRIG',
    'UNREALISTISCH'
);

-- =========================================================
-- CreateEnum: OfferRecommendation
-- =========================================================
CREATE TYPE "OfferRecommendation" AS ENUM (
    'AKZEPTIEREN',
    'GEGENANGEBOT',
    'ABLEHNEN'
);

-- =========================================================
-- CreateTable: MarketAnalysis
-- =========================================================
CREATE TABLE "MarketAnalysis" (
    "id"                     TEXT          NOT NULL,
    "createdAt"              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3)  NOT NULL,
    "listingId"              TEXT          NOT NULL,
    "priceConservative"      INTEGER,
    "priceFair"              INTEGER,
    "pricePremium"           INTEGER,
    "salesSpeed"             "SaleSpeed",
    "demand"                 "DemandLevel",
    "buyerSegments"          TEXT[]        DEFAULT ARRAY[]::TEXT[],
    "recommendedAskingPrice" INTEGER,
    "negotiationRange"       TEXT,
    "marketingStrategy"      TEXT,
    "risks"                  TEXT[]        DEFAULT ARRAY[]::TEXT[],
    "summary"                TEXT,
    "rawJson"                JSONB         NOT NULL,
    "model"                  TEXT,
    "promptTokens"           INTEGER,
    "completionTokens"       INTEGER,

    CONSTRAINT "MarketAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketAnalysis_listingId_key"
    ON "MarketAnalysis"("listingId");

ALTER TABLE "MarketAnalysis"
    ADD CONSTRAINT "MarketAnalysis_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================
-- CreateTable: OfferEvaluation
-- =========================================================
CREATE TABLE "OfferEvaluation" (
    "id"                 TEXT                  NOT NULL,
    "createdAt"          TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingId"          TEXT                  NOT NULL,
    "inquiryId"          TEXT,
    "offerAmount"        INTEGER               NOT NULL,
    "offerNote"          TEXT,
    "attractiveness"     "OfferAttractiveness",
    "successProbability" DOUBLE PRECISION,
    "recommendation"     "OfferRecommendation",
    "counterOffer"       INTEGER,
    "negotiationHints"   TEXT,
    "strategicAdvice"    TEXT,
    "rawJson"            JSONB                 NOT NULL,
    "model"              TEXT,

    CONSTRAINT "OfferEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfferEvaluation_listingId_createdAt_idx"
    ON "OfferEvaluation"("listingId", "createdAt");

CREATE INDEX "OfferEvaluation_inquiryId_idx"
    ON "OfferEvaluation"("inquiryId");

ALTER TABLE "OfferEvaluation"
    ADD CONSTRAINT "OfferEvaluation_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfferEvaluation"
    ADD CONSTRAINT "OfferEvaluation_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
