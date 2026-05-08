@echo off
REM ============================================================
REM 26_hotfix-listing-v2-migration.bat
REM
REM Symptom: /listings, /marketplace und Demo-Seed werfen
REM 500 / "Application error: server-side exception" — die DB
REM auf Railway hat die Listing-v2-Spalten noch nicht.
REM
REM Ursache: BAT 23 (prisma migrate dev) lief lokal nicht durch
REM bzw. das Migration-File wurde nicht ins Repo gepusht.
REM Auf Railway laeuft das Backend mit neuem Prisma-Client,
REM aber die DB-Tabelle "Listing" hat die neuen Spalten nicht.
REM
REM Fix:
REM   1) backend/prisma/migrations/20260508060000_listing_v2/
REM      migration.sql -- manuell angelegt mit den 3 Enums
REM      (BuildingCondition, EnergyClass, EnergyCarrier) + 30
REM      neuen Listing-Spalten
REM   2) backend/package.json -- start-Script jetzt:
REM      "prisma migrate deploy && node dist/index.js"
REM      damit Railway beim Container-Start automatisch
REM      neue Migrationen applied
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

git commit -m "fix(backend): Listing v2 Migration + Auto-Migrate beim Railway-Start"
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
echo  Hotfix gepusht.
echo  Railway:
echo    1) Build (tsc) -- 30-60s
echo    2) "prisma migrate deploy" beim Container-Start --
echo       legt die fehlenden Spalten + Enums in der DB an
echo    3) Backend startet
echo.
echo  Nach 2-3 Minuten:
echo    - https://infinityoikos.com/listings sollte laden
echo    - https://infinityoikos.com/marketplace -^> "Beispiel-
echo      Inserate laden" sollte 5 Demo-Inserate anlegen
echo.
echo  Falls weiterhin Fehler: Railway-Deployment-Logs anschauen,
echo  vor allem die Output-Zeilen von "prisma migrate deploy".
echo ============================================================
echo.
pause
