@echo off
REM ============================================================
REM 109_phase-m4-hotfix.bat
REM
REM Phase M4 Hotfix:
REM  - verifyToken statisch aus @clerk/backend importiert
REM    (dynamic await import() hat Railway-Build vermutlich abgewuergt)
REM  - Prisma where-Construct inline statt Record<string, unknown>
REM    (siehe Marco-Memory: TS2322-Pitfall)
REM
REM Direkt Commit + Push, kein lokaler Build noetig (Backend
REM kompiliert Railway selbst).
REM ============================================================

cd /d "%~dp0\.."

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"

echo === git add + commit ===
call git add -A
call git commit -m "Phase M4 hotfix: verifyToken statisch + Prisma where inline"

echo.
echo === git push origin main ===
call git push origin main
if errorlevel 1 (
    echo FEHLER: push fehlgeschlagen.
    pause
    exit /b 1
)

echo.
call git log --oneline -3
echo.
pause
