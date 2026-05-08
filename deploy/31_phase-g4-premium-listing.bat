@echo off
REM ============================================================
REM 31_phase-g4-premium-listing.bat
REM
REM Phase G4 - Premium-Listing (one-off, 99 EUR / 30 Tage) +
REM Verifiziert-Badge.
REM
REM   Schema:
REM     +Listing.featuredUntil (DateTime?)
REM     +Migration 20260508080000_listing_featured_until
REM     (Railway applied automatisch dank Auto-Migrate aus BAT 26)
REM
REM   Backend:
REM     +ENV STRIPE_PRICE_PREMIUM_LISTING (One-Time-Price)
REM     +POST /me/listings/:id/checkout-feature
REM       legt Stripe-Customer (falls fehlend) an, startet
REM       Checkout-Session mode=payment mit metadata.kind=premium_listing
REM     +Webhook-Handler erkennt mode=payment +
REM       metadata.kind=premium_listing und setzt featuredUntil
REM       auf max(now, vorhandener Wert) + 30 Tage (= Verlaengerung
REM       statt Reset)
REM     +/marketplace sortiert featured Listings nach oben
REM       (Post-Sort, kein DB-Index noetig)
REM     +/marketplace + /marketplace/:id liefern jetzt
REM       ownerVerified (true bei plan INVESTOR_PRO/SELLER_PRO)
REM       und featured (true bei featuredUntil > now)
REM
REM   Frontend:
REM     +ListingSchema um featuredUntil erweitert
REM     +MarketplaceListingSchema um ownerVerified + featured
REM     +FeatureCheckoutButton im Edit-Page (oberhalb der Form)
REM       - Inaktiv: "Premium starten (99 EUR)"
REM       - Aktiv: "Aktiv * X Tage" + "Um 30 Tage verlaengern"
REM     +ListingCard: Premium-Pill (lila Gradient) als erstes
REM       Top-Left-Badge; "verif."-Mini-Badge im Verkaeufer-Footer
REM     +Detail-Page: Premium-Pill im Header neben Asset-Typ;
REM       Verifiziert-Badge in Verkaeufer-Sidebar
REM     +Edit-Page: success/cancelled-Banner nach Stripe-Redirect
REM
REM   Doku:
REM     +deploy/STRIPE-SETUP.md ergaenzt um Product 3 +
REM       STRIPE_PRICE_PREMIUM_LISTING ENV
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "feat: Phase G4 Premium-Listing (one-off Checkout, Premium-Pill, Verifiziert-Badge)"
if errorlevel 1 (
    echo.
    echo Nichts zu committen oder Fehler.
    pause
    exit /b 1
)

git push
if errorlevel 1 (
    echo.
    echo FEHLER beim Push.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Phase G4 gepusht. Vercel + Railway bauen automatisch.
echo  Railway laeuft beim Container-Start "prisma migrate deploy"
echo  -^> Listing.featuredUntil-Spalte wird angelegt.
echo.
echo  Setup falls noch nicht gemacht (siehe STRIPE-SETUP.md):
echo    1) In Stripe Product "Premium Listing" anlegen,
echo       Price 99 EUR One-Time
echo    2) Railway ENV-Var:
echo       STRIPE_PRICE_PREMIUM_LISTING=price_...
echo    3) Backend wird neu gestartet, Endpoint ist scharf
echo.
echo  Smoke-Test:
echo    /listings/.../edit
echo      -^> "Premium-Listing"-Box oben, "Premium starten" Button
echo      -^> Klick fuehrt zu Stripe Checkout
echo      -^> Mit Test-Karte 4242... bezahlen
echo      -^> Webhook setzt featuredUntil = jetzt + 30 Tage
echo      -^> Card+Detail bekommen Premium-Pill
echo      -^> /marketplace zeigt es oben
echo.
echo  Wenn Plan eines Verkaeufers PRO ist:
echo    /marketplace und Detail-Page zeigen Verifiziert-Badge
echo    Test per SQL:
echo      UPDATE "User" SET plan='SELLER_PRO' WHERE email='...';
echo ============================================================
echo.
pause
