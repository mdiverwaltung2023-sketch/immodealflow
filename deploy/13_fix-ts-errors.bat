@echo off
REM ============================================================
REM 13_fix-ts-errors.bat
REM TS-Compile-Fehler im Backend fuer Phase C fixen.
REM Betroffen: GET /me/listings + GET /marketplace (Where-Type
RE. zu lax fuer Prisma).
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

git add backend/src/index.ts
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "fix(backend): TS-Compile-Errors fuer Listing-Endpoints (Prisma Where-Types strict)"
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
echo  Fix gepusht. Railway baut jetzt automatisch neu.
echo  In 1-2 Minuten sollte /listings funktionieren.
echo ============================================================
echo.
pause
