-- Phase L5.1 — RentalUnit v2 (mehr Felder) + UserRole +LANDLORD.

-- =========================================================
-- AlterEnum: UserRole +LANDLORD (vierte Hauptrolle)
-- =========================================================
ALTER TYPE "UserRole" ADD VALUE 'LANDLORD';

-- =========================================================
-- AlterTable: RentalUnit — ~22 neue Felder fuer detaillierte
-- Inserat-Anlage (analog zur 6-Section-Form vom Verkaufs-Listing).
-- Alle Bool-Felder mit DEFAULT false; petsAllowed nullable
-- (null = nach Absprache); Internet-Felder optional.
-- =========================================================
ALTER TABLE "RentalUnit"
    ADD COLUMN "yearBuilt"             INTEGER,
    ADD COLUMN "lastRenovation"        INTEGER,
    ADD COLUMN "totalUnits"            INTEGER,
    ADD COLUMN "bathrooms"             INTEGER,
    ADD COLUMN "separateGuestWc"       BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "balcony"               BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "balconyArea"           DOUBLE PRECISION,
    ADD COLUMN "terrace"               BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "terraceArea"           DOUBLE PRECISION,
    ADD COLUMN "garden"                BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "gardenShared"          BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "cellar"                BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "attic"                 BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "elevator"              BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "barrierFree"           BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "furnished"             BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "partlyFurnished"       BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "kitchenIncluded"       BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "kitchenBuyOut"         INTEGER,
    ADD COLUMN "parkingType"           TEXT,
    ADD COLUMN "parkingCost"           INTEGER,
    ADD COLUMN "petsAllowed"           BOOLEAN,
    ADD COLUMN "petsNote"              TEXT,
    ADD COLUMN "internetAvailable"     BOOLEAN,
    ADD COLUMN "internetSpeed"         TEXT,
    ADD COLUMN "minRentDurationMonths" INTEGER,
    ADD COLUMN "depositMonths"         DOUBLE PRECISION,
    ADD COLUMN "conditions"            TEXT;
