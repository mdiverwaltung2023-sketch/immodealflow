@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 95_fix-api-base-url.bat
REM
REM Behebt: Image-Upload bekommt "Cannot POST" weil Frontend-Build
REM die NEXT_PUBLIC_API_BASE_URL nicht inlined hatte. Fix: Default
REM auf https://api.infinityoikos.com in client-fetch + api-server.
REM
REM Schritte:
REM  1) Lock weg
REM  2) Hard-Reset auf origin/main (kaputte WC = weg)
REM  3) Backups einspielen:
REM     - nixpacks.toml (libvips fuer sharp)
REM     - imageProcessing.ts (Lazy-Loading)
REM     - client-fetch.ts (Default-Backend-URL)
REM     - api-server.ts (Default-Backend-URL)
REM  4) Commit + Push -> Vercel rebuildet Frontend
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste...
pause >nul
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/4] Fetch + Reset...
git fetch origin
git reset --hard origin/main
if errorlevel 1 ( echo FEHLER reset. & pause & exit /b 1 )

echo [2/4] Backups einspielen...
copy /Y "deploy\_nixpacks.toml.bak" "nixpacks.toml" >nul
copy /Y "deploy\_lazy_imageProcessing.ts.bak" "backend\src\lib\imageProcessing.ts" >nul
copy /Y "deploy\_client-fetch.ts.bak" "frontend\lib\client-fetch.ts" >nul
copy /Y "deploy\_api-server.ts.bak" "frontend\lib\api-server.ts" >nul
echo Done.

echo.
echo [3/4] Add + Commit...
git add nixpacks.toml backend/src/lib/imageProcessing.ts frontend/lib/client-fetch.ts frontend/lib/api-server.ts
git status --short
git commit -m "fix(frontend): Default-Backend-URL plus libvips plus lazy sharp"
if errorlevel 1 echo HINWEIS commit status != 0

echo.
echo [4/4] Push...
git push origin main
if errorlevel 1 ( echo FEHLER push. & pause & exit /b 1 )

echo.
echo === FERTIG ===
echo Vercel baut Frontend neu (2-3 Min).
echo Danach: Hard-Reload (Strg+Shift+R) auf /offmarket/leads/[id]/edit
echo und Bild hochladen.
echo.
echo Falls weiterhin "Cannot POST": oeffne DevTools (F12) -^> Network,
echo Bild hochladen, dann zeig mir die exakte URL des roten Requests.
echo.
pause
endlocal
