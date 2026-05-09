-- Phase H1: Coin- & Makler-Bindungssystem — Schema-Erweiterung.
-- Erweitert UserRole um BROKER, fuegt CoinTxKind-Enum hinzu, ergaenzt
-- den User um Coin-Felder + Self-Referral, und legt CoinTransaction +
-- CoinSpend Tabellen an.

-- =========================================================
-- AlterEnum: UserRole — neuer Wert BROKER
-- =========================================================
-- Hinweis: ALTER TYPE ... ADD VALUE ist in Postgres innerhalb einer
-- Transaktion erlaubt, der neue Wert wird in dieser Migration aber
-- noch nicht verwendet (kein UPDATE setzt BROKER) — sicher.
ALTER TYPE "UserRole" ADD VALUE 'BROKER';

-- =========================================================
-- CreateEnum: CoinTxKind
-- =========================================================
CREATE TYPE "CoinTxKind" AS ENUM (
    'PROFILE_COMPLETED',
    'LISTING_ACTIVATED',
    'SELLER_CONTACTED',
    'DAILY_LOGIN',
    'REFERRAL_BROKER_ONBOARDED',
    'SPEND_LISTING_HIGHLIGHT',
    'SPEND_PROFILE_BOOST',
    'SPEND_FEED_BOOST',
    'ADMIN_ADJUSTMENT'
);

-- =========================================================
-- AlterTable: User — Coin-Felder + Self-Referral
-- =========================================================
ALTER TABLE "User"
    ADD COLUMN "coinsBalance" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "isEarlyBird" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "isAdmin"     BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "referredById" TEXT;

-- Self-Referral FK (gewerbender User). ON DELETE SET NULL, damit
-- ein geloeschter Werber nicht den geworbenen User mitloescht.
ALTER TABLE "User"
    ADD CONSTRAINT "User_referredById_fkey"
    FOREIGN KEY ("referredById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Index fuer "wen habe ich geworben"-Lookups.
CREATE INDEX "User_referredById_idx"
    ON "User"("referredById");

-- =========================================================
-- CreateTable: CoinTransaction
-- =========================================================
CREATE TABLE "CoinTransaction" (
    "id"        TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"    TEXT         NOT NULL,
    "kind"      "CoinTxKind" NOT NULL,
    "amount"    INTEGER      NOT NULL,
    "refId"     TEXT,
    "note"      TEXT,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- Idempotenz-Constraint: pro (User, Kind, refId) max. eine Buchung.
CREATE UNIQUE INDEX "CoinTransaction_userId_kind_refId_key"
    ON "CoinTransaction"("userId", "kind", "refId");

CREATE INDEX "CoinTransaction_userId_createdAt_idx"
    ON "CoinTransaction"("userId", "createdAt");

CREATE INDEX "CoinTransaction_kind_createdAt_idx"
    ON "CoinTransaction"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "CoinTransaction"
    ADD CONSTRAINT "CoinTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================
-- CreateTable: CoinSpend
-- =========================================================
CREATE TABLE "CoinSpend" (
    "id"         TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"     TEXT         NOT NULL,
    "kind"       "CoinTxKind" NOT NULL,
    "targetId"   TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinSpend_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoinSpend_userId_validUntil_idx"
    ON "CoinSpend"("userId", "validUntil");

CREATE INDEX "CoinSpend_kind_validUntil_idx"
    ON "CoinSpend"("kind", "validUntil");

CREATE INDEX "CoinSpend_targetId_validUntil_idx"
    ON "CoinSpend"("targetId", "validUntil");

-- AddForeignKey
ALTER TABLE "CoinSpend"
    ADD CONSTRAINT "CoinSpend_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
