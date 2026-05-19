@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 100_softer-blur.bat
REM
REM Behebt: Blur-Variante war zu stark (Mosaik durch resize 64).
REM Jetzt sanft: nur Gauss-Blur 14px, keine Pixelation.
REM Lichtstimmung + Bauform bleiben erkennbar, Details weich.
REM
REM Geaendert:
REM  - backend/src/lib/imageProcessing.ts  (sharp Gauss 14, kein resize trick)
REM  - frontend/components/OffmarketImage.tsx (CSS-Blur 28->12)
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

echo [2/3] Backups einspielen...
copy /Y "deploy\_lazy_imageProcessing.ts.bak" "backend\src\lib\imageProcessing.ts" >nul
copy /Y "deploy\_OffmarketImage.tsx.bak" "frontend\components\OffmarketImage.tsx" >nul
echo Done.

echo.
echo [3/3] Stage + Commit + Push...
git add backend/src/lib/imageProcessing.ts frontend/components/OffmarketImage.tsx
git status --short
git commit -m "tweak(offmarket): sanftere Blur-Variante damit Lichtstimmung erkennbar bleibt"
if errorlevel 1 echo HINWEIS commit status != 0
git push origin main
if errorlevel 1 ( echo FEHLER push. & pause & exit /b 1 )

echo.
echo === FERTIG ===
echo Railway + Vercel bauen neu (beide Files geaendert).
echo 3-5 Min warten, dann altes Bild wegloeschen + neu hochladen.
echo Der neue Blur ist deutlich sanfter (kein Mosaik mehr).
echo.
pause
endlocal
