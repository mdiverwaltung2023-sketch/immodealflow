-- Phase L6.1 — RentalApplication.applicantUserId fuer Selbstbewerbungen
-- ueber die oeffentliche Mietboerse.

ALTER TABLE "RentalApplication"
    ADD COLUMN "applicantUserId" TEXT;

CREATE INDEX "RentalApplication_applicantUserId_idx"
    ON "RentalApplication"("applicantUserId");

ALTER TABLE "RentalApplication"
    ADD CONSTRAINT "RentalApplication_applicantUserId_fkey"
    FOREIGN KEY ("applicantUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
