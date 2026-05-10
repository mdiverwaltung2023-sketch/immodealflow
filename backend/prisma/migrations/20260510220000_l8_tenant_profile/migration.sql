-- Phase L8 — Mieter-Profil (TenantProfile).
-- Strikt AGG-konform: keine sensiblen Merkmale.

CREATE TABLE "TenantProfile" (
    "id"                 TEXT NOT NULL,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,
    "userId"             TEXT NOT NULL,

    "aboutText"          TEXT,

    "employmentType"     TEXT,
    "employmentDuration" TEXT,
    "employer"           TEXT,
    "monthlyNetIncome"   INTEGER,
    "additionalIncome"   INTEGER,
    "schufaScore"        TEXT,
    "hasSchufaCert"      BOOLEAN NOT NULL DEFAULT false,

    "householdSize"      INTEGER,
    "hasPets"            BOOLEAN NOT NULL DEFAULT false,
    "petDetails"         TEXT,
    "smoker"             BOOLEAN NOT NULL DEFAULT false,

    "desiredCity"        TEXT,
    "desiredAreaMin"     DOUBLE PRECISION,
    "desiredRoomsMin"    DOUBLE PRECISION,
    "desiredRentMax"     INTEGER,
    "desiredMoveInDate"  TIMESTAMP(3),
    "intendedDuration"   TEXT,
    "openForFurnished"   BOOLEAN NOT NULL DEFAULT false,
    "needsBarrierFree"   BOOLEAN NOT NULL DEFAULT false,
    "needsParking"       BOOLEAN NOT NULL DEFAULT false,

    "visibility"         "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',

    CONSTRAINT "TenantProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantProfile_userId_key" ON "TenantProfile"("userId");

ALTER TABLE "TenantProfile"
    ADD CONSTRAINT "TenantProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
