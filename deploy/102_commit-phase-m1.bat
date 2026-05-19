@echo off
REM ============================================================
REM 102_commit-phase-m1.bat
REM
REM Phase M1 — Commit + Push.
REM
REM Erstellt einen Commit mit allen Aenderungen aus Phase M1
REM und pusht auf main. Railway (Backend) und Vercel (Frontend)
REM deployen automatisch.
REM
REM Voraussetzung: 101_phase-m1-buyer-doc-access.bat ist gruen
REM durchgelaufen und die Migration ist lokal angewandt.
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
call git commit -m "Phase M1: BuyerDocAccess (Token-Freigabe) + Pipeline-Werbesicht, Kaufpreis-Entkopplung"
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
echo Push abgesetzt. Railway + Vercel deployen automatisch in ca. 1-2 Minuten.
echo Health-Check danach: https://dealflow-ai-backend-production.up.railway.app/health
echo.
pause
