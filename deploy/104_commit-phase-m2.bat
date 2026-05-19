@echo off
REM ============================================================
REM 104_commit-phase-m2.bat
REM
REM Phase M2 — Commit + Push.
REM
REM Erstellt einen Commit mit allen Frontend-Aenderungen aus Phase M2
REM (Public-Page /zugang/[token], BuyerAccessManager, horizontaler
REM Pipeline-Stepper, Middleware-Anpassung) und pusht auf main.
REM Vercel deployt das Frontend automatisch.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo === [1/3] git status ===
call git status
echo.

echo === [2/3] git add + commit ===
call git add -A
call git commit -m "Phase M2: BuyerAccessManager + /zugang/[token] Public-Page + horizontaler Pipeline-Stepper"
if errorlevel 1 (
    echo.
    echo HINWEIS: git commit hat nichts zu committen oder ist fehlgeschlagen.
)

echo.
echo === [3/3] git push ===
call git push origin main
if errorlevel 1 (
    echo.
    echo FEHLER: git push fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === Fertig ===
echo Push abgesetzt. Vercel deployt das Frontend automatisch in 1-2 Minuten.
echo Backend-Aenderungen gab es in M2 nicht — Railway-Service skipped.
echo.
pause
