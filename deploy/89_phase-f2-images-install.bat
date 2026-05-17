@echo off
setlocal
chcp 850 >nul

REM ============================================================
REM 89_phase-f2-images-install.bat
REM
REM Phase F.2 + F.3 - Offmarket-Bilder (Blur + KI-Stilisierung).
REM Installiert sharp, openai, vercel-blob, legt Migration an.
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste...
pause >nul
echo.

if exist ".git\index.lock" del /F /Q ".git\index.lock"

echo [1/3] npm install (root-workspace)...
call npm install
if errorlevel 1 (
    echo FEHLER npm install.
    pause
    exit /b 1
)
echo.

echo [2/3] Prisma generate...
cd backend
call npx prisma generate
if errorlevel 1 (
    echo FEHLER prisma generate.
    pause
    exit /b 1
)
echo.

echo [3/3] Migration anlegen + anwenden (lokal)...
call npx prisma migrate dev --name 20260517_add_offmarket_images
if errorlevel 1 (
    echo FEHLER prisma migrate.
    pause
    exit /b 1
)
echo.
cd ..

echo === FERTIG ===
echo Naechster Schritt: Klicke 90_phase-f2-commit.bat
echo um zu committen und zu pushen.
echo.
pause
endlocal
