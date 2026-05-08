-- Phase G1: User-Subscription-Plan + Stripe-Verknüpfung.

-- =========================================================
-- CreateEnum: UserPlan
-- =========================================================
CREATE TYPE "UserPlan" AS ENUM (
    'FREE',
    'INVESTOR_PRO',
    'SELLER_PRO'
);

-- =========================================================
-- AlterTable: User — Plan + Stripe-IDs
-- =========================================================
ALTER TABLE "User"
    ADD COLUMN "plan"                 "UserPlan" NOT NULL DEFAULT 'FREE',
    ADD COLUMN "planValidUntil"       TIMESTAMP(3),
    ADD COLUMN "stripeCustomerId"     TEXT,
    ADD COLUMN "stripeSubscriptionId" TEXT;

-- =========================================================
-- Unique-Constraints für Stripe-IDs (1:1 zwischen User und
-- Stripe-Customer / -Subscription)
-- =========================================================
CREATE UNIQUE INDEX "User_stripeCustomerId_key"
    ON "User"("stripeCustomerId");

CREATE UNIQUE INDEX "User_stripeSubscriptionId_key"
    ON "User"("stripeSubscriptionId");
