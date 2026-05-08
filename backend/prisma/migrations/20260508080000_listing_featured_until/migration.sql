-- Phase G4: Premium-Listing-Feature.
-- featuredUntil > now() -> Inserat wird im Marketplace oben sortiert,
-- bekommt eine "Premium"-Pill in der Card und in der Detail-Seite.
-- Wird beim Stripe-Checkout-Erfolg (mode=payment, kind=premium_listing)
-- auf now + 30 Tage gesetzt.

ALTER TABLE "Listing"
    ADD COLUMN "featuredUntil" TIMESTAMP(3);
