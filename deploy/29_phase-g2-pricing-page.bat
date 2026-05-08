@echo off
REM ============================================================
REM 29_phase-g2-pricing-page.bat
REM
REM Phase G2 - Frontend-Seite der Stripe-Integration:
REM
REM   1) /pricing
REM      - Hero + 3-Plan-Vergleich (Free | Investor Pro | Verkäufer Pro)
REM      - Monatlich/Jährlich-Toggle
REM      - CheckoutButton (POST /me/billing/checkout -> Stripe URL)
REM      - Banner für ?billing=success / ?billing=cancelled
REM      - FAQ-Block (Kündigung, Verifiziert-Badge, Karten, Free-Limits)
REM      - Hint wenn Stripe noch nicht configured
REM
REM   2) PlanBadge-Component
REM      - Free / Investor Pro / Verkäufer Pro mit Tone-Mapping
REM      - Free klickbar zur /pricing
REM
REM   3) TopBar
REM      - PlanBadge rechts neben dem Rolle-Badge
REM
REM   4) SideNav
REM      - Footer-Block: bei Free ein dezenter Upgrade-Banner,
REM        bei Pro das aktuelle Plan-Badge mit "Verwalten"-Link
REM      - Neuer Konto-Eintrag "Tarife" -> /pricing
REM
REM   5) /profile
REM      - BillingCard ganz oben:
REM        Pro-User: "Abo verwalten (Stripe)"-Button -> Customer Portal
REM        Free-User: Upgrade-CTA zur /pricing
REM
REM   6) /listings/new
REM      - Free-Limit-Banner wenn schon 1+ ACTIVE Inserate vorhanden
REM        (Hint: Entwurf geht weiter, Aktivieren erfordert Pro)
REM
REM   7) MarketplaceFilters Sidebar
REM      - Off-Market-Toggle ist fuer Free gesperrt mit Lock-Icon
REM        und Link "Investor Pro freischalten"
REM
REM   Backend:
REM      - GET /me liefert jetzt zusaetzlich plan + planValidUntil
REM        (war vorher nur in /me/billing)
REM
REM   Schemas:
REM      - UserPlanEnum, USER_PLAN_LABELS
REM      - BillingStateSchema
REM      - MeSchema um plan + planValidUntil erweitert
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

git commit -m "feat: Phase G2 Pricing-Page + Plan-Badge + Upgrade-Hints"
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
echo  Phase G2 gepusht. Vercel + Railway bauen automatisch.
echo.
echo  Nach dem Build (1-3 Minuten):
echo    https://infinityoikos.com/pricing
echo      - 3-Plan-Vergleich, Toggle, CheckoutButton
echo    https://infinityoikos.com/profile
echo      - BillingCard ganz oben
echo    Sidebar-Footer:
echo      - Free: Upgrade-CTA  /  Pro: Plan-Badge + Verwalten
echo    /listings/new bei Free + 1 Listing aktiv:
echo      - Limit-Banner mit Upgrade-Link
echo    /marketplace Sidebar:
echo      - Off-Market ist gesperrt fuer Free, Lock-Icon klickt
echo        zur /pricing
echo.
echo  Voraussetzung: Stripe-Setup aus deploy/STRIPE-SETUP.md ist
echo  bereits durchgefuehrt (Products + Prices + Webhook + ENV).
echo  Wenn Stripe noch nicht configured ist:
echo  - Pricing-Page zeigt einen Hint-Banner
echo  - CheckoutButton bleibt sichtbar, antwortet aber 503
echo ============================================================
echo.
pause
