-- Phase M1: Token-basierte Dokumenten-Freigabe an Kaufinteressenten.
-- Verkaeufer erzeugt pro Interessent einen Link, waehlt erlaubte
-- SaleDocKind-Kategorien und teilt den Link. Kaeufer oeffnet OHNE Account.

-- =========================================================
-- CreateTable: BuyerDocAccess
-- =========================================================
CREATE TABLE "BuyerDocAccess" (
    "id"              TEXT          NOT NULL,
    "createdAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)  NOT NULL,
    "listingId"       TEXT          NOT NULL,
    "sellerId"        TEXT          NOT NULL,
    "inquiryId"       TEXT,
    "buyerUserId"     TEXT,
    "buyerLabel"      TEXT,
    "buyerEmail"      TEXT,
    "notes"           TEXT,
    "token"           TEXT          NOT NULL,
    "allowedDocKinds" "SaleDocKind"[] NOT NULL DEFAULT ARRAY[]::"SaleDocKind"[],
    "expiresAt"       TIMESTAMP(3),
    "revokedAt"       TIMESTAMP(3),
    "lastAccessedAt"  TIMESTAMP(3),
    "accessCount"     INTEGER       NOT NULL DEFAULT 0,

    CONSTRAINT "BuyerDocAccess_pkey" PRIMARY KEY ("id")
);

-- Token global eindeutig
CREATE UNIQUE INDEX "BuyerDocAccess_token_key"
    ON "BuyerDocAccess"("token");

CREATE INDEX "BuyerDocAccess_listingId_sellerId_idx"
    ON "BuyerDocAccess"("listingId", "sellerId");

CREATE INDEX "BuyerDocAccess_sellerId_revokedAt_idx"
    ON "BuyerDocAccess"("sellerId", "revokedAt");

-- AddForeignKeys
ALTER TABLE "BuyerDocAccess"
    ADD CONSTRAINT "BuyerDocAccess_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerDocAccess"
    ADD CONSTRAINT "BuyerDocAccess_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyerDocAccess"
    ADD CONSTRAINT "BuyerDocAccess_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BuyerDocAccess"
    ADD CONSTRAINT "BuyerDocAccess_buyerUserId_fkey"
    FOREIGN KEY ("buyerUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
