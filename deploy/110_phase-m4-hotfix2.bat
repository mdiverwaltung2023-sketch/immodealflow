@echo off
REM ============================================================
REM 110_phase-m4-hotfix2.bat
REM
REM Phase M4 Hotfix #2:
REM   Im /me/buyer-access-received Endpoint fehlten description +
REM   propertyType im Listing-Select. listingPublicView() braucht
REM   beide -> TS2345 Compile-Error auf Railway.
REM
REM Reiner Backend-Edit. Direkt push, Railway baut neu.
REM ============================================================

cd /d "%~dp0\.."

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"

call git add -A
call git commit -m "Phase M4 hotfix #2: description + propertyType in buyer-access-received select"
call git push origin main
if errorlevel 1 (
    echo FEHLER: push fehlgeschlagen.
    pause
    exit /b 1
)

call git log --oneline -3
echo.
pause
