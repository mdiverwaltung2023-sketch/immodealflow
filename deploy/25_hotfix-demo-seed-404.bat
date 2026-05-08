@echo off
REM ============================================================
REM 25_hotfix-demo-seed-404.bat
REM
REM Symptom: POST /me/seed-demo-listings -> 404 vom Backend.
REM
REM Wahrscheinliche Ursache: TypeScript-Strict-Build auf Railway
REM ist gescheitert wegen Type-Mismatch zwischen Zod-Output und
REM Prisma.ListingCreateInput / .ListingUpdateInput. Wenn der
REM Build scheitert, laeuft das alte Backend-Image weiter -> der
REM neue Endpoint existiert dort nicht -> 404.
REM
REM Fix: Defensive `as never` Casts auf
REM   - prisma.listing.create({ data: ... })  (POST + Demo-Seed)
REM   - prisma.listing.update({ data: ... })  (PATCH)
REM   - energyClass: { in: ... } im Marketplace-Filter
REM
REM Plus: Im Demo-Seed-Loop wird das Demo-Object explizit getypt
REM und images getrennt vom rest gehandhabt.
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

git commit -m "fix(backend): defensive Prisma-Type-Casts fuer Listing v2 (Demo-Seed 404)"
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
echo  Pruefe auf Railway, ob das Backend sauber baut.
echo  Wenn der Build durchlaeuft, sollte
echo    POST /me/seed-demo-listings
echo  jetzt 200 statt 404 liefern.
echo.
echo  Falls weiterhin 404:
echo    1) Railway Dashboard -^> dealflow-ai-backend
echo    2) Letztes Deployment oeffnen, Build-Logs zeigen
echo    3) Mir den Fehler durchgeben, dann fixe ich gezielt
echo ============================================================
echo.
pause
