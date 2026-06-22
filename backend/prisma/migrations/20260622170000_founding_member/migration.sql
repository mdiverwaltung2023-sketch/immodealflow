-- Oikos Investor Club: Gruendungsmitglied-Flag am User.
-- Additive Migration. Laeuft via `prisma migrate deploy` beim Railway-Start.

ALTER TABLE "User" ADD COLUMN "isFoundingMember" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "foundingMemberAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "foundingMemberNo" INTEGER;
