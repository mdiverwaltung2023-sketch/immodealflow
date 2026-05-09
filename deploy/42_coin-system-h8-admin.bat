@echo off
REM ============================================================
REM 42_coin-system-h8-admin.bat
REM
REM Phase H8 — Coin-System: Admin-Dashboard.
REM
REM Aenderungen Backend (backend/src/index.ts):
REM   - GET /me liefert zusaetzlich isAdmin
REM   - ensureAdmin-Middleware (inline) fuer alle /admin/coins/*
REM   - GET /admin/coins/overview
REM       totalUsers, earlyBirdsActive/Limit, coinsInCirculation,
REM       avgBalance, activeSpendsCount, topEarners (10),
REM       topSpenders (10, ueber CoinTransaction.groupBy negativ),
REM       sumsByKind (count + total pro CoinTxKind)
REM   - GET /admin/coins/transactions  ?userId=&kind=&from=&to=&limit
REM       Tabelle aller CoinTransactions inkl. user-Mini
REM   - GET /admin/coins/active-spends
REM       Liste der laufenden Spends inkl. Listing-Mini bei Highlights
REM   - POST /admin/coins/adjust  body { userId, amount, note }
REM       Schreibt ADMIN_ADJUSTMENT mit refId=adj-^<ts^>-^<rand^>,
REM       blockt negative Salden, Note erhaelt "[admin:^<id^>]"-Praefix
REM
REM Aenderungen Frontend:
REM   - lib/api.ts: AdminCoinsOverviewSchema,
REM     AdminCoinsTransactionsSchema, AdminCoinsActiveSpendsSchema,
REM     MeSchema +isAdmin
REM   - app/admin/coins/page.tsx (Server Component, isAdmin-Guard
REM     redirected sonst auf /dashboard) — 3 Sektionen:
REM     Uebersicht (KPI-Tiles + Top-10 + Sums-Tabelle),
REM     Transaktionen (letzte 100 mit User-Mini),
REM     Aktive Spends.
REM   - app/admin/coins/AdminAdjustForm.tsx (Client Component):
REM     Manuelle Korrektur mit Audit-Note, refresh per router.refresh().
REM   - components/SidebarShell.tsx + SideNav.tsx:
REM     SECTION_ADMIN ("Coin-Dashboard") nur wenn me.isAdmin === true.
REM
REM ============================================================
REM WICHTIG — Admin-Flag aktivieren:
REM   Nach dem Push musst du dein eigenes isAdmin-Flag in Postgres
REM   setzen, sonst zeigt das Frontend den Admin-Eintrag nicht an
REM   und das Backend antwortet 403.
REM
REM   Railway -^> dealflow-postgres -^> Data -^> Tabelle "User"
REM   -^> deine Zeile -^> Spalte isAdmin -^> auf true -^> Save
REM
REM   Alternativ via SQL-Editor:
REM     UPDATE "User" SET "isAdmin" = true WHERE email = 'mdbaukonzept@gmail.com';
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

git commit -m "feat(coins): Phase H8 Admin-Dashboard (overview/transactions/active-spends/adjust + isAdmin-Flag)"
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
echo  Phase H8 gepusht.
echo  Railway + Vercel bauen neu.
echo.
echo  NACH dem Build:
echo    1) Railway -^> Postgres -^> Tabelle User -^> deine Zeile
echo       -^> isAdmin auf true setzen, SAVE
echo    2) Im Frontend einmal /me neu laden (z.B. /coins oeffnen)
echo    3) Sidebar zeigt jetzt eine "Admin"-Sektion mit
echo       "Coin-Dashboard" -^> oeffnen
echo
echo  Dort siehst du:
echo    - KPIs (User, Early-Birds, Coins in Umlauf, Aktive Spends)
echo    - Top-10 Earner + Top-10 Spender
echo    - Bewegung pro Kind (Aggregat ueber alle Buchungen)
echo    - Letzte 100 Transaktionen mit User
echo    - Alle aktiven Spends (mit Restzeit + Listing-Bezug)
echo    - Manuelles Adjust-Formular
echo
echo  H8 ist die letzte Coin-Phase. Damit ist V1 vollstaendig.
echo ============================================================
echo.
pause
