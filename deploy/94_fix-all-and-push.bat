@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 94_fix-all-and-push.bat
REM Komplett-Fix in einem Klick:
REM  1) Lock weg
REM  2) Hard-Reset auf origin/main
REM  3) Backups aus deploy/_*.bak einspielen:
REM     - nixpacks.toml (vips fuer sharp)
REM     - imageProcessing.ts (Lazy-Loading)
REM  4) Add + Commit + Push
REM Doppelte Absicherung:
REM  A) Nixpacks installiert vips -> sharp baut sauber
REM  B) Lazy-Loading -> Container startet auch ohne sharp
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste...
pause >nul
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/5] Fetch origin...
git fetch origin
if errorlevel 1 ( echo FEHLER fetch. & pause & exit /b 1 )

echo [2/5] Hard-Reset auf origin/main...
git reset --hard origin/main
if errorlevel 1 ( echo FEHLER reset. & pause & exit /b 1 )

echo [3/5] Backups einspielen...
copy /Y "deploy\_nixpacks.toml.bak" "nixpacks.toml" >nul
copy /Y "deploy\_lazy_imageProcessing.ts.bak" "backend\src\lib\imageProcessing.ts" >nul
echo Backups in Position.

echo.
echo [4/5] Stagen + Status:
git add nixpacks.toml backend/src/lib/imageProcessing.ts
git status --short

echo.
echo [5/5] Commit + Push...
git commit -m "fix(railway): libvips via nixpacks plus sharp lazy-load"
if errorlevel 1 echo HINWEIS commit-status != 0
git push origin main
if errorlevel 1 ( echo FEHLER push. & pause & exit /b 1 )

echo.
echo === FERTIG ===
echo Railway baut neu. Erwartung:
echo   - vips wird via nixpacks.toml installiert
echo   - sharp postinstall laeuft sauber durch
echo   - falls vips trotzdem fehlt: Container startet (lazy)
echo.
echo Pruefe in 2-3 Min:
echo   https://api.infinityoikos.com/health -- erwartet ok:true
echo   /offmarket/leads/[id]/edit -- Bild hochladen
echo.
pause
endlocal
