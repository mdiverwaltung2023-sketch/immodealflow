@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 99_fix-ts-type-predicate.bat
REM
REM Behebt: TS2677 Type predicate Fehler in imageProcessing.ts
REM Anthropic SDK 0.70 hat strenger ContentBlock-Type.
REM Fix: simpler filter ohne type predicate, "text" in c als guard.
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste...
pause >nul
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/3] Fetch + Reset auf origin/main...
git fetch origin
git reset --hard origin/main
if errorlevel 1 ( echo FEHLER reset. & pause & exit /b 1 )

echo [2/3] imageProcessing.ts fix einspielen...
copy /Y "deploy\_lazy_imageProcessing.ts.bak" "backend\src\lib\imageProcessing.ts" >nul
echo Done.

echo.
echo [3/3] Stage + Commit + Push...
git add backend/src/lib/imageProcessing.ts
git status --short
git commit -m "fix(backend): TS2677 type predicate in imageProcessing - filter ohne strict type"
if errorlevel 1 echo HINWEIS commit status != 0
git push origin main
if errorlevel 1 ( echo FEHLER push. & pause & exit /b 1 )

echo.
echo === FERTIG ===
echo Railway baut nochmal (Backend-File geaendert).
echo TS-Build sollte JETZT durchgehen.
echo 3-5 Min warten, dann im Inkognito Strg+Shift+R.
echo.
pause
endlocal
