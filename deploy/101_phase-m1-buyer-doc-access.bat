@echo off
REM ============================================================
REM 101_phase-m1-buyer-doc-access.bat
REM
REM Phase M1 — Verkaufsabwicklung 2.0, Schritt 1.
REM
REM Was passiert hier:
REM   1) Prisma Schema enthaelt neues Model "BuyerDocAccess"
REM      (Token-Freigabe von Dokumenten an einen Kaufinteressenten).
REM      Bestehende SaleProcess/SaleDocument-Tabellen bleiben unveraendert.
REM   2) Migration 20260519120000_buyer_doc_access_m1 wird lokal angewandt.
REM   3) Prisma Client neu generieren.
REM   4) Lockfile pruefen (npm install), damit Railway "npm ci" nicht
REM      ueber einen Drift stolpert.
REM   5) Status checken — wenn alles gruen, kann gepusht werden
REM      (separate BAT 102_commit-phase-m1.bat fuer git commit/push).
REM
REM Nachgelagerte Phase M2 (eigenes BAT) wird das Frontend-Tab und
REM den Freigabe-UI nachreichen.
REM
REM Aenderungen UI in dieser Phase:
REM   - StartSaleProcessButton zeigt jetzt Pipeline + Dokumenten-Slots
REM     auch BEVOR die Pipeline gestartet wurde (Werbe-Sicht).
REM   - Kein Modal mehr beim Start, kein Pflicht-Kaufpreis.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

REM --- [1/4] Lockfile-Sync (Lockfile wird durch crypto-import nicht
REM beeinflusst, aber wir bleiben konsistent zum Phase-F-Vorbild). ---
echo === [1/4] npm install (Workspaces, Lockfile-Sync) ===
call npm install
if errorlevel 1 (
    echo.
    echo FEHLER: npm install fehlgeschlagen.
    pause
    exit /b 1
)

cd backend

echo.
echo === [2/4] Prisma Client generieren ===
call npx prisma generate
if errorlevel 1 (
    echo.
    echo FEHLER: prisma generate fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [3/4] Migration ausfuehren (lokal) ===
REM "migrate dev" wendet die bereits angelegte Migrations-Datei
REM 20260519120000_buyer_doc_access_m1 an und stellt Drift fest.
call npx prisma migrate dev --name buyer_doc_access_m1
if errorlevel 1 (
    echo.
    echo FEHLER: prisma migrate dev fehlgeschlagen.
    echo Pruefe DATABASE_URL in backend\.env
    pause
    exit /b 1
)

echo.
echo === [4/4] Status pruefen ===
call npx prisma migrate status
if errorlevel 1 (
    echo HINWEIS: prisma migrate status lieferte einen Warncode.
)

cd ..

echo.
echo === Fertig ===
echo Migration ist lokal angewandt. Auf Railway laeuft sie automatisch
echo via "prisma migrate deploy" im Build-Hook beim naechsten Push.
echo.
echo Naechster Schritt: Klicke folgende BAT: 102_commit-phase-m1.bat
echo.
pause
