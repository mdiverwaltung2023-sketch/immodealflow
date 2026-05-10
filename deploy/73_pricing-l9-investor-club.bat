@echo off
REM ============================================================
REM 73_pricing-l9-investor-club.bat
REM
REM Phase L9 — Pricing-Pivot.
REM
REM POSITIONIERUNGSWECHSEL
REM   Von "SaaS-Tarifen" zu Mitgliedschaft im Investor Club.
REM   Verkaeufer/Vermieter inserieren in der Wachstumsphase generell
REM   kostenlos. Monetarisierung primaer ueber Investor Club (19 EUR/Mo
REM   oder 190 EUR/Jahr). Kein Founder Access (Lifetime-Bindung
REM   bewusst vermieden).
REM
REM AENDERUNG BACKEND
REM   backend/src/lib/billing.ts:
REM     - PLAN_LIMITS.FREE.activeListingsMax = null (war 1)
REM       -> Verkaeufer/Vermieter inserieren unbegrenzt.
REM     - PLAN_LIMITS.SELLER_PRO bleibt fuer Bestandskunden, aber
REM       ohne harte Limits (effektiv = FREE + Verifiziert-Badge).
REM
REM   backend/src/index.ts:
REM     - Listing-Limit-Hinweis verweist nicht mehr auf SELLER_PRO,
REM       upgradeTo zeigt jetzt INVESTOR_PRO. Da das Limit fuer FREE
REM       jetzt unbegrenzt ist, wird der Code-Pfad in der Praxis
REM       nicht mehr getriggert — bleibt aber als Safety-Net.
REM
REM AENDERUNG FRONTEND
REM   frontend/lib/api.ts:
REM     - USER_PLAN_LABELS:
REM       FREE = "Beobachter"
REM       INVESTOR_PRO = "Investor Club"
REM       SELLER_PRO = "Verkaeufer Pro (Legacy)"
REM
REM   frontend/components/PlanBadge.tsx:
REM     - Labels und Tooltip aktualisiert.
REM
REM   frontend/components/SideNav.tsx:
REM     - Sidebar-Footer: "Investor Club starten -> 19 EUR/Mon" statt
REM       "Auf Pro upgraden".
REM
REM   frontend/app/profile/BillingCard.tsx:
REM     - Upgrade-Hint outcome-orientiert: "Werde Mitglied im Investor
REM       Club", CTA "Mitgliedschaft starten".
REM
REM   frontend/app/listings/new/page.tsx:
REM     - Free-Listing-Limit-Banner entfernt — Inserieren ist
REM       unbegrenzt. Kleiner Hint im Subtitle: "Inserieren ist
REM       kostenlos und unbegrenzt."
REM
REM   frontend/app/pricing/IntervalToggle.tsx (komplett neu):
REM     - Zwei Karten: Beobachter + Investor Club (mittig, hervorgehoben).
REM     - Toggle Monatlich (19 EUR) / Jaehrlich (190 EUR, "−2 Monate").
REM     - Outcome-orientierte Bullet-Liste, keine Feature-Bullet-Listen.
REM     - Trust-Strip (3 Stats) unter den Karten.
REM
REM   frontend/app/pricing/page.tsx:
REM     - Neue Hero-Headline: "Werde Mitglied im Investor Club."
REM     - Neue Subheadline + Verkaeufer/Vermieter-Hinweis.
REM     - FAQ outcome-orientiert (Off-Market, KI-Zuverlaessigkeit,
REM       Verkaeufer-kostenlos, Verifiziert-Badge, Kuendigung).
REM
REM ENV / STRIPE — MARCO MUSS MANUELL TUN
REM   Im Stripe-Dashboard zwei neue Prices anlegen (oder bestehende
REM   anpassen):
REM     - 19 EUR/Monat fuer "Investor Club" (recurring, monthly)
REM     - 190 EUR/Jahr fuer "Investor Club" (recurring, yearly)
REM   Die Price-IDs in Railway-ENV setzen:
REM     STRIPE_PRICE_INVESTOR_MONTHLY=price_...
REM     STRIPE_PRICE_INVESTOR_YEARLY=price_...
REM   STRIPE_PRICE_SELLER_* werden nicht mehr verwendet — duerfen
REM   aber stehen bleiben (kein Code-Pfad triggert sie).
REM
REM   Bestandskunden auf SELLER_PRO behalten ihren Plan bis zum
REM   Ende ihrer aktuellen Stripe-Periode und werden danach
REM   automatisch auf FREE downgegradet (Stripe-Webhook
REM   subscription.deleted greift wie bisher).
REM
REM Kein Schema-Aenderung, keine Migration. Reiner Code-Push.
REM npm install defensiv mitlaufen lassen.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo === Schritt 1: npm install (Lockfile-Sync) ===
echo.

call npm install
if errorlevel 1 (
    echo.
    echo FEHLER bei npm install. Pruefe Internet / Node-Version.
    pause
    exit /b 1
)

echo.
echo === Schritt 2: git ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "feat(pricing): Phase L9 Investor Club Pivot — 19 EUR/Mo, Verkaeufer kostenlos"
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
echo  Phase L9 gepusht. Vercel und Railway bauen neu (^~2 Min).
echo
echo  STRIPE-DASHBOARD-AUFGABE (manuell):
echo    1. Im Stripe-Dashboard zwei Prices anlegen oder anpassen:
echo         - 19 EUR / Monat (recurring monthly)
echo         - 190 EUR / Jahr  (recurring yearly)
echo    2. Beide Price-IDs kopieren.
echo    3. In Railway -^> Backend -^> Variables setzen:
echo         STRIPE_PRICE_INVESTOR_MONTHLY=price_...
echo         STRIPE_PRICE_INVESTOR_YEARLY=price_...
echo    4. Backend neu deployen (Railway laesst sich automatisch
echo       neu bauen sobald die ENV gespeichert ist).
echo
echo  Verifikation:
echo    1. /pricing aufrufen -^> neue Hero "Werde Mitglied im
echo       Investor Club", zwei Karten (Beobachter + Investor
echo       Club), Trust-Strip, neue FAQ.
echo    2. Toggle "Monatlich" zeigt 19 EUR, "Jaehrlich" 190 EUR.
echo    3. /listings/new -^> Limit-Banner ist weg.
echo    4. Sidebar-Footer (FREE-User) zeigt "Investor Club starten".
echo    5. /profile -^> BillingCard sagt "Werde Mitglied im
echo       Investor Club".
echo
echo  Bestandskunden auf SELLER_PRO behalten ihren Plan, sehen
echo  die alte Bezeichnung "Verkaeufer Pro (Legacy)" im PlanBadge,
echo  und werden am Periodenende automatisch auf FREE migriert.
echo ============================================================
echo.
pause
