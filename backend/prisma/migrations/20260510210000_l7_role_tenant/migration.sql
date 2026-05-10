-- Phase L7 — neue Rolle TENANT (Mieter)
-- Damit kann ein User explizit als reiner Mieter onboarden und sieht
-- in der App nur Mieter-Features (Mietboerse + Meine Bewerbungen).

ALTER TYPE "UserRole" ADD VALUE 'TENANT';
