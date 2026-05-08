@echo off
REM ============================================================
REM 32_hotfix-prisma-generate.bat
REM
REM Symptom: Phase G4 (und vermutlich G1-G3 nach Schema-Aenderungen)
REM scheitert auf Railway mit "Failed to build an image".
REM
REM Ursache: Das build-Skript war nur "tsc" — Prisma-Client wurde
REM nach Schema-Aenderungen NICHT regeneriert. TypeScript greift
REM dann auf einen veralteten Prisma-Client (ohne User.plan,
REM Listing.featuredUntil etc.) und der Build wirft Type-Errors.
REM
REM Fix in backend/package.json:
REM   "build":      "prisma generate && tsc -p tsconfig.json"
REM   "postinstall":"prisma generate"
REM
REM "postinstall" sorgt dafuer, dass der Prisma-Client schon nach
REM "npm install" auf den richtigen Stand gebracht wird; "build"
REM macht es danach nochmal explizit.
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

git commit -m "fix(backend): prisma generate im build + postinstall fuer Type-Sync"
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
echo  Railway baut jetzt mit "prisma generate && tsc" -^>
echo  Prisma-Client ist auf Schema-Stand bevor TypeScript laeuft.
echo  Sollte saemtliche bisherigen Type-Mismatches beheben.
echo.
echo  In ~2 Minuten in Railway -^> Deployments pruefen,
echo  ob "feat: Phase G4 ..." jetzt SUCCESSFUL statt FAILED ist.
echo ============================================================
echo.
pause
