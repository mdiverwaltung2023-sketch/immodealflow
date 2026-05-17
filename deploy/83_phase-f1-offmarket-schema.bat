@echo off
REM ============================================================
REM 83_phase-f1-offmarket-schema.bat
REM
REM Phase F1 — Offmarket-Layer als additives Zusatzfeature.
REM Bestehendes Listing/Marketplace/Inquiry/Rating/SaleProcess
REM bleibt 1:1 unveraendert.
REM
REM Neue Models:
REM   - OffmarketLead     (diskrete Verkaufsabsicht, NIE im /marketplace)
REM   - OffmarketInvite   (Owner laedt gezielt Investor ein)
REM   - OffmarketMessage  (1:1-Chat pro Invite, ab ACCEPTED)
REM
REM Neue Enums:
REM   - OffmarketLeadStatus    {DRAFT, ACTIVE, PAUSED, CLOSED}
REM   - OffmarketInviteStatus  {PENDING, ACCEPTED, DECLINED, WITHDRAWN, EXPIRED}
REM
REM Schritte:
REM   1) prisma generate (Client neu erzeugen)
REM   2) prisma migrate dev --name 20260517_add_offmarket
REM   3) Schema gegen DB testen
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

cd backend

echo === [1/3] Prisma Client generieren ===
call npx prisma generate
if errorlevel 1 (
    echo.
    echo FEHLER: prisma generate fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [2/3] Migration ausfuehren (lokal) ===
call npx prisma migrate dev --name 20260517_add_offmarket
if errorlevel 1 (
    echo.
    echo FEHLER: prisma migrate dev fehlgeschlagen.
    echo Pruefe DATABASE_URL in backend\.env
    pause
    exit /b 1
)

echo.
echo === [3/3] Erfolg ===
echo Migration 20260517_add_offmarket ist lokal angewandt.
echo Auf Railway wird sie beim naechsten Deploy automatisch
echo via "prisma migrate deploy" im Build-Hook ausgefuehrt.
echo.
pause
