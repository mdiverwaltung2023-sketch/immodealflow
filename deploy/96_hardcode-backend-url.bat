@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 96_hardcode-backend-url.bat
REM
REM Allerletzter Sicherheitsgurt: Backend-URL fest im Code,
REM unabhaengig von Vercel-env-vars. Mit Console-Log zum Debug.
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

echo [2/4] Hardcoded client-fetch.ts einspielen...
copy /Y "deploy\_client-fetch.ts.bak" "frontend\lib\client-fetch.ts" >nul
echo Done.

echo.
echo [3/4] Add + Commit...
git add frontend/lib/client-fetch.ts
git status --short
git commit -m "fix(frontend): hardcoded API base as final fallback plus console log"
if errorlevel 1 echo HINWEIS commit status != 0

echo.
echo [4/4] Push...
git push origin main
if errorlevel 1 ( echo FEHLER push. & pause & exit /b 1 )

echo.
echo === FERTIG ===
echo Vercel baut neu (2-3 Min). Danach im Browser Console (F12)
echo Eintrag "[Infinity Oikos] API base: https://api.infinityoikos.com"
echo sichtbar. Damit kann der Fetch nicht mehr auf Vercel-Domain landen.
echo.
pause
endlocal
