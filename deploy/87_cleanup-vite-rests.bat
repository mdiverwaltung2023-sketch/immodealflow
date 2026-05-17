@echo off
setlocal
chcp 65001 >nul

REM ============================================================
REM 87_cleanup-vite-rests.bat
REM
REM Loescht den alten Vite-Krempel im frontend/, der den Vercel-
REM Build sprengt (Next.js erkennt frontend/src/pages/ als
REM Legacy-Pages-Router und scheitert an unaufloesbaren Imports
REM wie @/components/InvoiceTable).
REM
REM Loescht:
REM   - frontend/src/             (kompletter alter Vite-Code)
REM   - frontend/index.html       (Vite-Entry)
REM   - frontend/vite.config.ts
REM   - frontend/eslint.config.js (Vite-ESLint, Next.js hat eigene)
REM   - frontend/tsconfig.app.json
REM   - frontend/tsconfig.node.json
REM   - frontend/tsconfig.tsbuildinfo
REM   - frontend/public/vite.svg
REM
REM Danach: Add + Commit + Push.
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste um Vite-Reste zu loeschen + zu pushen...
pause >nul
echo.

REM --- Schritt 1: Lock-Datei aufraeumen (falls noch da) ---
if exist ".git\index.lock" (
    echo Lock-Datei vorhanden, loesche...
    del /F /Q ".git\index.lock"
)

REM --- Schritt 2: Vite-Reste loeschen ---
echo [1/4] Loesche alte Vite-Dateien...
if exist "frontend\src"                rmdir /S /Q "frontend\src"
if exist "frontend\index.html"         del /F /Q  "frontend\index.html"
if exist "frontend\vite.config.ts"     del /F /Q  "frontend\vite.config.ts"
if exist "frontend\eslint.config.js"   del /F /Q  "frontend\eslint.config.js"
if exist "frontend\tsconfig.app.json"  del /F /Q  "frontend\tsconfig.app.json"
if exist "frontend\tsconfig.node.json" del /F /Q  "frontend\tsconfig.node.json"
if exist "frontend\tsconfig.tsbuildinfo" del /F /Q "frontend\tsconfig.tsbuildinfo"
if exist "frontend\public\vite.svg"    del /F /Q  "frontend\public\vite.svg"
echo Geloescht.
echo.

REM --- Schritt 3: Git-Status ---
echo [2/4] Git-Status nach Cleanup:
git status --short
echo.

REM --- Schritt 4: Add + Commit + Push ---
echo [3/4] Stage + Commit...
git add -A
git commit -m "chore(frontend): Vite-Reste entfernen (sprengten Vercel-Build)"

echo.
echo [4/4] Push nach main...
git push origin main
if errorlevel 1 (
    echo FEHLER: push fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === FERTIG ===
echo Vercel baut jetzt neu. In 1-2 Minuten teste:
echo   https://immodealflow-frontend.vercel.app/offmarket
echo.
pause
endlocal
