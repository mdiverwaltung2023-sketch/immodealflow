@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 93_fix-railway-libvips.bat
REM
REM Komplett-Fix:
REM  1) Working Copy auf origin/main zuruecksetzen (alle 23
REM     "modified" Files werden auf Server-Stand korrigiert)
REM  2) nixpacks.toml (libvips-System-Pkg fuer sharp) bleibt
REM     untracked dank git reset
REM  3) Add + commit + push nixpacks.toml
REM
REM Wahrscheinliche Crash-Ursache: sharp-postinstall scheitert
REM ohne libvips. Nixpacks installiert vips nun explizit.
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste...
pause >nul
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/5] Aktuelle Aenderungen (werden verworfen):
git status --short
echo.

echo [2/5] Hard-Reset auf origin/main...
git fetch origin
git reset --hard origin/main
if errorlevel 1 (
    echo FEHLER bei reset.
    pause
    exit /b 1
)
echo.

echo [3/5] Status nach Reset (nixpacks.toml sollte untracked sein):
git status --short
echo.

echo [4/5] nixpacks.toml committen + pushen...
git add nixpacks.toml
git commit -m "fix(railway): libvips als System-Pkg fuer sharp (Nixpacks)"
if errorlevel 1 (
    echo HINWEIS: commit hat Status != 0 (evtl. schon committet).
)
git push origin main
if errorlevel 1 (
    echo FEHLER push.
    pause
    exit /b 1
)
echo.

echo [5/5] FERTIG.
echo Railway baut jetzt mit libvips. Erwartung:
echo   - Build-Logs: "Installing nix packages... vips"
echo   - sharp postinstall laeuft durch
echo   - Container startet ohne Crash
echo   - "Applying migration 20260517125930_..._offmarket_images"
echo   - /offmarket/leads/[id]/edit -- Image-Upload funktioniert
echo.
echo Pruefe in 2-3 Min im Railway-Dashboard.
pause
endlocal
