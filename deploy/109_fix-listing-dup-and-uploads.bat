@echo off
REM ============================================================
REM 109_fix-listing-dup-and-uploads.bat
REM
REM Zwei Bugfixes:
REM  1. Doppelter Listing-Insert beim Anlegen (Doppelklick-Race):
REM     Backend bekommt 60-Sek-Dedup-Window, Frontend einen
REM     synchronen useRef-Submit-Guard.
REM  2. Bilder-Upload-Probleme:
REM     - Multi-Select via "multiple" + Drag-and-Drop
REM     - Client-Upload via @vercel/blob/client (kein 4-MB-Limit mehr,
REM       2x schneller, kein Funktion-Hop)
REM     - Client-seitige JPEG-Komprimierung (max 2560px, q=0.85)
REM     - Pro-File-Progress + Fehler-State
REM
REM Build wird VOR dem Push lokal verifiziert. Bei Fehler -> kein Push.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"

REM Aufraeumen einer leeren Temp-Datei, die der Sandbox-Workspace beim
REM Null-Byte-Strip hinterlassen hat (keine Permission zum Loeschen im
REM Linux-Sandbox).
if exist "frontend\app\api\blob-upload\route.ts.clean" del /f /q "frontend\app\api\blob-upload\route.ts.clean"

echo === [1/5] npm install (Lockfile-Sync) ===
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo FEHLER: npm install fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [2/5] Backend: tsc --noEmit ===
call npx -w backend tsc --noEmit
if errorlevel 1 (
    echo FEHLER: Backend TypeScript-Check fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [3/5] Frontend: next build ===
call npm run build -w frontend
if errorlevel 1 (
    echo FEHLER: Frontend build fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === [4/5] git add + commit ===
call git status -s
call git add -A
call git commit -m "Fix: Listing-Doppel-Insert (Dedup-Window + Submit-Guard) + Bilder-Upload (Client-Upload, Multi-Select, Compression, Progress)"
if errorlevel 1 (
    echo HINWEIS: nichts zu committen.
)

echo.
echo === [5/5] git push origin main ===
call git push origin main
if errorlevel 1 (
    echo FEHLER: git push fehlgeschlagen.
    pause
    exit /b 1
)

echo.
call git log --oneline -3
echo.
echo === FERTIG. Railway + Vercel deployen jetzt automatisch. ===
echo === In ~1-2 Min: /health pruefen, dann Listing anlegen + ===
echo === mehrere Bilder via Drag-and-Drop hochladen.            ===
echo.
pause
