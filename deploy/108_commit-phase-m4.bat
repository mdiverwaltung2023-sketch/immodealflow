@echo off
REM ============================================================
REM 108_commit-phase-m4.bat
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"

echo === [1/3] git status ===
call git status -s

echo.
echo === [2/3] git add + commit ===
call git add -A
call git commit -m "Phase M4: BuyerAccessManager auf /sales + /freigaben + /empfangene-freigaben + Sidebar + Auto-Bind"
if errorlevel 1 (
    echo HINWEIS: git commit nichts zu committen.
)

echo.
echo === [3/3] git push origin main ===
call git push origin main
if errorlevel 1 (
    echo FEHLER: git push fehlgeschlagen.
    pause
    exit /b 1
)

echo.
call git log --oneline -3
echo.
pause
