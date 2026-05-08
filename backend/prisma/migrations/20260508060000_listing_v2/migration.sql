-- Listing v2: USP-Felder für MFH/Gewerbe (Vermietungs-Cockpit, Energie,
-- Bausubstanz, Mieter-Mix). Alle Felder optional, keine Default-Werte
-- ausser für die Array-Felder (leeres Array statt NULL).
-- Manuell erstellt, weil prisma migrate dev lokal nicht durchgelaufen ist.

-- =========================================================
-- CreateEnum: BuildingCondition
-- =========================================================
CREATE TYPE "BuildingCondition" AS ENUM (
    'NEW',
    'REFURBISHED',
    'MODERNIZED',
    'MAINTAINED',
    'NEEDS_RENOVATION'
);

-- =========================================================
-- CreateEnum: EnergyClass
-- =========================================================
CREATE TYPE "EnergyClass" AS ENUM (
    'A_PLUS',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H'
);

-- =========================================================
-- CreateEnum: EnergyCarrier
-- =========================================================
CREATE TYPE "EnergyCarrier" AS ENUM (
    'GAS',
    'OIL',
    'ELECTRIC',
    'DISTRICT_HEATING',
    'HEAT_PUMP',
    'PELLETS',
    'WOOD',
    'SOLAR',
    'OTHER'
);

-- =========================================================
-- AlterTable: Listing — viele neue optionale Spalten
-- =========================================================
ALTER TABLE "Listing"
    ADD COLUMN "yearBuilt"            INTEGER,
    ADD COLUMN "lastRenovation"       INTEGER,
    ADD COLUMN "condition"            "BuildingCondition",
    ADD COLUMN "livingArea"           DOUBLE PRECISION,
    ADD COLUMN "commercialArea"       DOUBLE PRECISION,
    ADD COLUMN "landArea"             DOUBLE PRECISION,
    ADD COLUMN "floors"               INTEGER,
    ADD COLUMN "residentialUnits"     INTEGER,
    ADD COLUMN "commercialUnits"      INTEGER,
    ADD COLUMN "energyClass"          "EnergyClass",
    ADD COLUMN "energyConsumption"    DOUBLE PRECISION,
    ADD COLUMN "energyCarrier"        "EnergyCarrier",
    ADD COLUMN "heatingType"          TEXT,
    ADD COLUMN "actualRent"           INTEGER,
    ADD COLUMN "vacancyRate"          DOUBLE PRECISION,
    ADD COLUMN "waltMonths"           DOUBLE PRECISION,
    ADD COLUMN "rentIndexed"          BOOLEAN,
    ADD COLUMN "rentEscalation"       BOOLEAN,
    ADD COLUMN "rentUpsidePotential"  INTEGER,
    ADD COLUMN "modernizationBacklog" INTEGER,
    ADD COLUMN "gegCompliant"         BOOLEAN,
    ADD COLUMN "commissionRate"       DOUBLE PRECISION,
    ADD COLUMN "commissionFree"       BOOLEAN,
    ADD COLUMN "buyerCommission"      DOUBLE PRECISION,
    ADD COLUMN "availableFrom"        TIMESTAMP(3),
    ADD COLUMN "features"             TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "highlights"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "tenantCount"          INTEGER,
    ADD COLUMN "anchorTenant"         TEXT,
    ADD COLUMN "tenantSectors"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
