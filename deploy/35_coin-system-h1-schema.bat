@echo off
REM ============================================================
REM 35_coin-system-h1-schema.bat
REM
REM Phase H1 — Coin- und Makler-Bindungssystem: Schema + Migration.
REM
REM Was passiert:
REM   1) backend/prisma/schema.prisma erweitert um:
REM       - UserRole +BROKER
REM       - CoinTxKind enum (9 Werte)
REM       - User-Felder: coinsBalance, isEarlyBird, isAdmin,
REM         referredById (Self-Referral)
REM       - Modelle CoinTransaction + CoinSpend (mit Indizes
REM         und Idempotenz-Constraint)
REM   2) Migration 20260509000000_coin_system_h1/migration.sql
REM       - ALTER TYPE UserRole ADD VALUE 'BROKER'
REM       - CREATE TYPE CoinTxKind
REM       - ALTER TABLE User (4 neue Spalten + FK)
REM       - CREATE TABLE CoinTransaction + CoinSpend
REM       - alle Indizes inkl. Unique-Idempotenz
REM
REM npm install ist Pflicht: Lockfile-Sync (siehe BAT 34) - sonst
REM scheitert Railway "npm ci" beim naechsten Build.
REM
REM Nach diesem Push:
REM   - Railway baut neu, "prisma migrate deploy" laeuft im start-Skript
REM     und legt die neuen Tabellen + Spalten an.
REM   - Phase H2 (lib/coins.ts mit earn/spend) folgt im naechsten BAT.
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
echo === Schritt 2: Prisma Client lokal regenerieren ===
echo.

call npm run prisma:generate --workspace backend
if errorlevel 1 (
    echo.
    echo WARNUNG: prisma generate fehlgeschlagen — pruefe schema.prisma.
    pause
    exit /b 1
)

echo.
echo === Schritt 3: git status ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "feat(coins): Phase H1 Schema + Migration (BROKER-Rolle, CoinTransaction, CoinSpend)"
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
echo  Phase H1 gepusht.
echo  Railway baut neu mit "prisma migrate deploy" -^>
echo  legt CoinTransaction + CoinSpend an, erweitert User.
echo.
echo  Verifikation:
echo    Railway -^> Postgres -^> Tabellen -^> "CoinTransaction"
echo    und "CoinSpend" muessen sichtbar sein.
echo    User-Tabelle hat neue Spalten coinsBalance, isEarlyBird,
echo    isAdmin, referredById.
echo.
echo  Naechster Schritt: BAT 36 = Phase H2 (lib/coins.ts mit
echo    earn/spend-Helpern + Unit-Test-Hooks).
echo ============================================================
echo.
pause
