-- Phase M3: In-App-Notifications fuer Verkaeufer.
-- Erster Use-Case: Erst-Abruf eines BuyerDocAccess-Tokens durch den Kaufinteressenten.

-- =========================================================
-- CreateEnum: UserNotificationKind
-- =========================================================
CREATE TYPE "UserNotificationKind" AS ENUM (
    'FIRST_BUYER_ACCESS',
    'REPEAT_BUYER_ACCESS',
    'INQUIRY_RECEIVED',
    'SALE_STAGE_CHANGED'
);

-- =========================================================
-- CreateTable: UserNotification
-- =========================================================
CREATE TABLE "UserNotification" (
    "id"          TEXT                   NOT NULL,
    "createdAt"   TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"      TEXT                   NOT NULL,
    "kind"        "UserNotificationKind" NOT NULL,
    "title"       TEXT                   NOT NULL,
    "body"        TEXT,
    "link"        TEXT,
    "payloadJson" JSONB,
    "readAt"      TIMESTAMP(3),

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserNotification_userId_readAt_createdAt_idx"
    ON "UserNotification"("userId", "readAt", "createdAt");

CREATE INDEX "UserNotification_userId_kind_idx"
    ON "UserNotification"("userId", "kind");

ALTER TABLE "UserNotification"
    ADD CONSTRAINT "UserNotification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
