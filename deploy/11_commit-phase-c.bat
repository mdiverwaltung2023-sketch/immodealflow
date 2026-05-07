@echo off
REM ============================================================
REM 11_commit-phase-c.bat
REM Commit + Push der kompletten Phase C
REM (Listings + Marketplace + Bilder + Doku).
REM Setzt voraus, dass 10_migrate-c1-listing.bat schon gelaufen ist.
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

git commit -m "feat: Phase C - Verkaeufer-Listings + Marketplace + Bilder-Upload (Vercel Blob)"
if errorlevel 1 (
    echo.
    echo Nichts zu committen oder Fehler. Pruefe Output.
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
echo  Commit + Push erfolgreich.
echo  Railway deployt das Backend automatisch (inkl. Migration).
echo  Vercel deployt das Frontend automatisch (inkl. neuer Pages).
echo.
echo  WICHTIG: Wenn Bilder-Upload genutzt werden soll, muss
echo  Vercel Blob aktiviert werden:
echo  Vercel Dashboard -^> Project -^> Storage -^> Blob -^> Create.
echo  Dann ist BLOB_READ_WRITE_TOKEN automatisch gesetzt.
echo ============================================================
echo.
pause
