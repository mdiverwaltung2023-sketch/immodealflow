-- Phase J1: Verkaufsabwicklung — Stages, Dokumente, Audit-Log.

-- =========================================================
-- CreateEnum: SaleStage (13 Werte, inkl. ABGEBROCHEN)
-- =========================================================
CREATE TYPE "SaleStage" AS ENUM (
    'ANFRAGE_AKZEPTIERT',
    'BESICHTIGUNG',
    'VERHANDLUNG',
    'RESERVIERUNG_LOI',
    'NOTARENTWURF',
    'NOTARTERMIN',
    'BEURKUNDET',
    'AUFLASSUNGSVORMERKUNG',
    'KAUFPREISZAHLUNG',
    'UEBERGABE',
    'EIGENTUMSUMSCHREIBUNG',
    'ABGESCHLOSSEN',
    'ABGEBROCHEN'
);

-- =========================================================
-- CreateEnum: SaleDocKind (14 Kategorien)
-- =========================================================
CREATE TYPE "SaleDocKind" AS ENUM (
    'GRUNDBUCH',
    'ENERGIEAUSWEIS',
    'FLURKARTE',
    'WOHNFLAECHENBERECHNUNG',
    'KAUFVERTRAG_ENTWURF',
    'KAUFVERTRAG_BEURKUNDET',
    'VORFAELLIGKEITSSCHREIBEN',
    'AUFLASSUNGSVORMERKUNG',
    'UEBERGABEPROTOKOLL',
    'TEILUNGSERKLAERUNG',
    'EIGENTUEMERVERSAMMLUNG_PROTOKOLL',
    'MIETVERTRAEGE',
    'MAKLERVERTRAG',
    'SONSTIGES'
);

-- =========================================================
-- CreateTable: SaleProcess
-- =========================================================
CREATE TABLE "SaleProcess" (
    "id"                TEXT         NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    "listingId"         TEXT         NOT NULL,
    "inquiryId"         TEXT,
    "sellerId"          TEXT         NOT NULL,
    "buyerId"           TEXT,
    "currentStage"      "SaleStage"  NOT NULL DEFAULT 'ANFRAGE_AKZEPTIERT',
    "stageEnteredAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes"             TEXT,
    "targetClosingDate" TIMESTAMP(3),
    "agreedPrice"       INTEGER,

    CONSTRAINT "SaleProcess_pkey" PRIMARY KEY ("id")
);

-- inquiryId unique (1:1 zu Inquiry, nullable fuer Off-Market-Deals)
CREATE UNIQUE INDEX "SaleProcess_inquiryId_key"
    ON "SaleProcess"("inquiryId");

CREATE INDEX "SaleProcess_sellerId_currentStage_idx"
    ON "SaleProcess"("sellerId", "currentStage");

CREATE INDEX "SaleProcess_listingId_currentStage_idx"
    ON "SaleProcess"("listingId", "currentStage");

CREATE INDEX "SaleProcess_buyerId_idx"
    ON "SaleProcess"("buyerId");

-- AddForeignKeys
ALTER TABLE "SaleProcess"
    ADD CONSTRAINT "SaleProcess_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleProcess"
    ADD CONSTRAINT "SaleProcess_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SaleProcess"
    ADD CONSTRAINT "SaleProcess_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleProcess"
    ADD CONSTRAINT "SaleProcess_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- =========================================================
-- CreateTable: SaleStageEntry (Audit-Log)
-- =========================================================
CREATE TABLE "SaleStageEntry" (
    "id"        TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processId" TEXT         NOT NULL,
    "stage"     "SaleStage"  NOT NULL,
    "note"      TEXT,
    "byUserId"  TEXT,

    CONSTRAINT "SaleStageEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SaleStageEntry_processId_createdAt_idx"
    ON "SaleStageEntry"("processId", "createdAt");

ALTER TABLE "SaleStageEntry"
    ADD CONSTRAINT "SaleStageEntry_processId_fkey"
    FOREIGN KEY ("processId") REFERENCES "SaleProcess"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleStageEntry"
    ADD CONSTRAINT "SaleStageEntry_byUserId_fkey"
    FOREIGN KEY ("byUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- =========================================================
-- CreateTable: SaleDocument
-- =========================================================
CREATE TABLE "SaleDocument" (
    "id"             TEXT          NOT NULL,
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processId"      TEXT          NOT NULL,
    "kind"           "SaleDocKind" NOT NULL,
    "url"            TEXT          NOT NULL,
    "filename"       TEXT          NOT NULL,
    "sizeBytes"      INTEGER       NOT NULL,
    "uploaderUserId" TEXT,

    CONSTRAINT "SaleDocument_pkey" PRIMARY KEY ("id")
);

-- Pro (process, kind) nur eine Datei -> Re-Upload ueberschreibt
CREATE UNIQUE INDEX "SaleDocument_processId_kind_key"
    ON "SaleDocument"("processId", "kind");

CREATE INDEX "SaleDocument_processId_idx"
    ON "SaleDocument"("processId");

ALTER TABLE "SaleDocument"
    ADD CONSTRAINT "SaleDocument_processId_fkey"
    FOREIGN KEY ("processId") REFERENCES "SaleProcess"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleDocument"
    ADD CONSTRAINT "SaleDocument_uploaderUserId_fkey"
    FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
