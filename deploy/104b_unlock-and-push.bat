@echo off
REM ============================================================
REM 104b_unlock-and-push.bat
REM
REM Entfernt einen verwaisten .git/index.lock (von einem gecrashten
REM Git-Prozess) und macht dann Commit + Push fuer Phase M2.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo === [1/4] git-Lock pruefen + entfernen ===
if exist ".git\index.lock" (
    echo Loesche .git\index.lock ...
    del /f /q ".git\index.lock"
)
if exist ".git\HEAD.lock" (
    del /f /q ".git\HEAD.lock"
)

echo.
echo === [2/4] git status ===
call git status -s

echo.
echo === [3/4] git add + commit ===
call git add -A
call git commit -m "Phase M2: BuyerAccessManager + /zugang/[token] Public-Page + horizontaler Pipeline-Stepper"
if errorlevel 1 (
    echo.
    echo HINWEIS: git commit hat nichts zu committen oder ist fehlgeschlagen.
)

echo.
echo === [4/4] git push origin main ===
call git push origin main
if errorlevel 1 (
    echo.
    echo FEHLER: git push fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo === Fertig ===
call git log --oneline -3
echo.
pause
