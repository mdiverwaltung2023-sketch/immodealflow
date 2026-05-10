-- Phase L1: Vermietungsplattform — Schema.

-- =========================================================
-- CreateEnum: RentalStatus
-- =========================================================
CREATE TYPE "RentalStatus" AS ENUM (
    'DRAFT',
    'AVAILABLE',
    'RESERVED',
    'RENTED',
    'ARCHIVED'
);

-- =========================================================
-- CreateEnum: ApplicationStatus
-- =========================================================
CREATE TYPE "ApplicationStatus" AS ENUM (
    'NEW',
    'REVIEWING',
    'VIEWING',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN'
);

-- =========================================================
-- CreateEnum: ApplicantRating
-- =========================================================
CREATE TYPE "ApplicantRating" AS ENUM (
    'SEHR_PASSEND',
    'PASSEND',
    'BEDINGT_PASSEND',
    'EHER_UNPASSEND'
);

-- =========================================================
-- CreateTable: RentalUnit
-- =========================================================
CREATE TABLE "RentalUnit" (
    "id"                TEXT             NOT NULL,
    "createdAt"         TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)     NOT NULL,
    "ownerId"           TEXT             NOT NULL,
    "title"             TEXT             NOT NULL,
    "description"       TEXT             NOT NULL DEFAULT '',
    "city"              TEXT             NOT NULL,
    "district"          TEXT,
    "postalCode"        TEXT,
    "fullAddress"       TEXT,
    "rooms"             DOUBLE PRECISION NOT NULL,
    "livingArea"        DOUBLE PRECISION NOT NULL,
    "floor"             TEXT,
    "rentCold"          INTEGER          NOT NULL,
    "utilities"         INTEGER,
    "totalRent"         INTEGER,
    "deposit"           INTEGER,
    "energyClass"       "EnergyClass",
    "energyConsumption" DOUBLE PRECISION,
    "energyCarrier"     "EnergyCarrier",
    "heatingType"       TEXT,
    "status"            "RentalStatus"   NOT NULL DEFAULT 'DRAFT',
    "availableFrom"     TIMESTAMP(3),
    "fixedTerm"         BOOLEAN          NOT NULL DEFAULT false,
    "fixedTermMonths"   INTEGER,
    "features"          TEXT[]           DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "RentalUnit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentalUnit_ownerId_idx"  ON "RentalUnit"("ownerId");
CREATE INDEX "RentalUnit_status_idx"   ON "RentalUnit"("status");
CREATE INDEX "RentalUnit_city_idx"     ON "RentalUnit"("city");

ALTER TABLE "RentalUnit"
    ADD CONSTRAINT "RentalUnit_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================
-- CreateTable: RentalUnitImage
-- =========================================================
CREATE TABLE "RentalUnitImage" (
    "id"        TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unitId"    TEXT         NOT NULL,
    "url"       TEXT         NOT NULL,
    "alt"       TEXT,
    "sortOrder" INTEGER      NOT NULL DEFAULT 0,

    CONSTRAINT "RentalUnitImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentalUnitImage_unitId_sortOrder_idx"
    ON "RentalUnitImage"("unitId", "sortOrder");

ALTER TABLE "RentalUnitImage"
    ADD CONSTRAINT "RentalUnitImage_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================
-- CreateTable: RentalApplication
-- =========================================================
CREATE TABLE "RentalApplication" (
    "id"                 TEXT                NOT NULL,
    "createdAt"          TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3)        NOT NULL,
    "unitId"             TEXT                NOT NULL,
    "applicantName"      TEXT                NOT NULL,
    "email"              TEXT,
    "phone"              TEXT,
    "monthlyNetIncome"   INTEGER,
    "employmentType"     TEXT,
    "employmentDuration" TEXT,
    "schufaScore"        TEXT,
    "householdSize"      INTEGER,
    "hasPets"            BOOLEAN             NOT NULL DEFAULT false,
    "petDetails"         TEXT,
    "smoker"             BOOLEAN             NOT NULL DEFAULT false,
    "desiredMoveInDate"  TIMESTAMP(3),
    "intendedDuration"   TEXT,
    "notes"              TEXT,
    "status"             "ApplicationStatus" NOT NULL DEFAULT 'NEW',

    CONSTRAINT "RentalApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentalApplication_unitId_status_idx"
    ON "RentalApplication"("unitId", "status");

ALTER TABLE "RentalApplication"
    ADD CONSTRAINT "RentalApplication_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================
-- CreateTable: ApplicantEvaluation
-- =========================================================
CREATE TABLE "ApplicantEvaluation" (
    "id"                 TEXT              NOT NULL,
    "createdAt"          TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationId"      TEXT              NOT NULL,
    "rating"             "ApplicantRating" NOT NULL,
    "summary"            TEXT              NOT NULL,
    "strengths"          TEXT[]            DEFAULT ARRAY[]::TEXT[],
    "risks"              TEXT[]            DEFAULT ARRAY[]::TEXT[],
    "openQuestions"      TEXT[]            DEFAULT ARRAY[]::TEXT[],
    "financialStability" TEXT,
    "sizeFit"            TEXT,
    "expectedDuration"   TEXT,
    "reliability"        TEXT,
    "communication"      TEXT,
    "recommendViewing"   BOOLEAN           NOT NULL DEFAULT false,
    "requestDocuments"   TEXT,
    "suggestFollowUp"    TEXT,
    "rationale"          TEXT,
    "rawJson"            JSONB             NOT NULL,
    "model"              TEXT,

    CONSTRAINT "ApplicantEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicantEvaluation_applicationId_createdAt_idx"
    ON "ApplicantEvaluation"("applicationId", "createdAt");

ALTER TABLE "ApplicantEvaluation"
    ADD CONSTRAINT "ApplicantEvaluation_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
