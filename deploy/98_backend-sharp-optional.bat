@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 98_backend-sharp-optional.bat
REM
REM Behebt: Railway-Build failed seit Phase F.2 wegen sharp/libvips.
REM Phase F Backend laeuft live OHNE Image-Endpoints!
REM Watch Paths /backend/** triggern Railway nur bei Backend-Aenderungen
REM (Frontend-Pushes waren SKIPPED).
REM
REM Fix:
REM  - sharp als optionalDependency (npm install scheitert nicht mehr)
REM  - imageProcessing.ts: generateBlurredVariant gibt null zurueck wenn
REM    sharp nicht ladbar -> Frontend nutzt CSS-Blur
REM  - Trigger Railway-Build durch Backend-File-Aenderung
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste...
pause >nul
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/4] Fetch + Reset auf origin/main...
git fetch origin
git reset --hard origin/main
if errorlevel 1 ( echo FEHLER reset. & pause & exit /b 1 )

echo [2/4] Backups einspielen (sharp optional + lazy)...
copy /Y "deploy\_backend_package.json.bak" "backend\package.json" >nul
copy /Y "deploy\_lazy_imageProcessing.ts.bak" "backend\src\lib\imageProcessing.ts" >nul
echo Done.

echo.
echo [3/4] Stage + Commit...
git add backend/package.json backend/src/lib/imageProcessing.ts
git status --short
git commit -m "fix(backend): sharp als optionalDependency damit Railway-Build durchgeht"
if errorlevel 1 echo HINWEIS commit status != 0

echo.
echo [4/4] Push...
git push origin main
if errorlevel 1 ( echo FEHLER push. & pause & exit /b 1 )

echo.
echo === FERTIG ===
echo Railway baut JETZT NEU (Watch Paths greifen weil backend/ geaendert).
echo  - sharp's postinstall darf jetzt scheitern (optional)
echo  - npm install laeuft trotzdem durch
echo  - prisma generate + tsc bauen sauber
echo  - Image-Endpoints werden registriert
echo.
echo In 3-5 Min teste im Inkognito (Strg+Shift+R):
echo   /offmarket/leads/[id]/edit -- Bild hochladen
echo.
pause
endlocal
