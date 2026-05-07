@echo off
REM ============================================================
REM 20_commit-rebrand-design.bat
REM Rebranding (DealFlow AI -> Infinity Oikos) + neues Design
REM (Two-Column Sign-in/Sign-up + Landing) + RatingForm-Quote-Fix
REM + Cloudflare-Setup-Anleitung in einem Push.
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "feat: Rebranding zu Infinity Oikos + Two-Column Sign-Pages + Cloudflare-Doku"
if errorlevel 1 (
    echo.
    echo Nichts zu committen oder Fehler.
    pause
    exit /b 1
)

git push
if errorlevel 1 (
    echo.
    echo FEHLER beim Push.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Commit + Push erfolgreich.
echo  Vercel baut Frontend automatisch (1-2 Minuten).
echo  Railway-Backend ist nicht betroffen.
echo.
echo  ANLEITUNG fuer Domain-Setup:
echo  -^> deploy\CLOUDFLARE-SETUP.md lesen
echo ============================================================
echo.
pause
