@echo off
REM ============================================================
REM 12_fix-lockfile.bat
REM Fixt den Build-Bug auf Railway: @vercel/blob ist in
REM frontend/package.json, aber package-lock.json war nicht
REM aktualisiert -> Railway 'npm ci' bricht ab.
REM Diese BAT fuehrt 'npm install' aus und committet+pusht das
REM aktualisierte Lockfile.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo [1/3] npm install (aktualisiert package-lock.json fuer @vercel/blob) ...
call npm install
if errorlevel 1 (
    echo.
    echo FEHLER bei npm install.
    pause
    exit /b 1
)

echo.
echo [2/3] Aktualisiertes Lockfile committen ...
git add package-lock.json frontend/package.json
git commit -m "fix(frontend): package-lock.json fuer @vercel/blob synchronisieren"
if errorlevel 1 (
    echo.
    echo Nichts zu committen oder Fehler. Pruefe Output.
    pause
    exit /b 1
)

echo.
echo [3/3] Push ...
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
