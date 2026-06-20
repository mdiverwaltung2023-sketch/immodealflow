@echo off
REM ============================================================
REM verify.bat  --  Lokale Pruefung vor dem Push
REM 1) Prisma-Client neu generieren (sonst SaleDocKind-Typfehler)
REM 2) Backend Typecheck (tsc --noEmit)
REM 3) Frontend Typecheck (tsc --noEmit)
REM Bei Erfolg: bereit fuer deploy\push.bat
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo [1/3] Prisma-Client generieren...
call npm run prisma:generate -w backend
if errorlevel 1 (
    echo.
    echo FEHLER bei prisma generate. Abbruch.
    pause
    exit /b 1
)

echo.
echo [2/3] Backend Typecheck...
call npx tsc --noEmit -p backend
if errorlevel 1 (
    echo.
    echo Backend-Typecheck FEHLGESCHLAGEN. Bitte Fehler oben pruefen.
    pause
    exit /b 1
)

echo.
echo [3/3] Frontend Typecheck...
pushd frontend
call npx tsc --noEmit
set FE=%errorlevel%
popd
if not "%FE%"=="0" (
    echo.
    echo Frontend-Typecheck FEHLGESCHLAGEN. Bitte Fehler oben pruefen.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Alle Checks gruen. Naechster Schritt: deploy\push.bat
echo  (oder vorher deploy\dev.bat fuer lokalen Live-Test).
echo ============================================================
echo.
pause
