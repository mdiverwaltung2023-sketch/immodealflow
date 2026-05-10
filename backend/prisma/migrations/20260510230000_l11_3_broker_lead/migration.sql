-- Phase L11.3 — Makler-Vermittlungs-Lead.

CREATE TYPE "BrokerLeadStatus" AS ENUM (
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'CLOSED_WON',
    'CLOSED_LOST'
);

CREATE TABLE "BrokerLead" (
    "id"              TEXT NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "status"          "BrokerLeadStatus" NOT NULL DEFAULT 'NEW',

    "firstName"       TEXT NOT NULL,
    "lastName"        TEXT NOT NULL,
    "email"           TEXT NOT NULL,
    "phone"           TEXT NOT NULL,

    "street"          TEXT NOT NULL,
    "postalCode"      TEXT NOT NULL,
    "city"            TEXT NOT NULL,

    "assetType"       TEXT NOT NULL,
    "locationQuality" TEXT NOT NULL,
    "area"            DOUBLE PRECISION NOT NULL,
    "yearBuilt"       INTEGER NOT NULL,
    "condition"       TEXT NOT NULL,
    "occupancy"       TEXT NOT NULL,
    "saleReason"      TEXT NOT NULL,
    "timePressure"    TEXT NOT NULL,
    "experience"      TEXT NOT NULL,
    "estimatedValue"  INTEGER,

    "scoreSelbst"     INTEGER NOT NULL,
    "scoreMakler"     INTEGER NOT NULL,

    "ownerNote"       TEXT,
    "aiReportSummary" TEXT,
    "internalNote"    TEXT,

    CONSTRAINT "BrokerLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrokerLead_status_createdAt_idx"
    ON "BrokerLead"("status", "createdAt");

CREATE INDEX "BrokerLead_city_idx"
    ON "BrokerLead"("city");
