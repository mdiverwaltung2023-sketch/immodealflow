@echo off
setlocal
chcp 65001 >nul

REM ============================================================
REM 88_offmarket-lead-edit.bat
REM
REM Phase F.1 — Edit-Page fuer Offmarket-Inserate.
REM
REM Neu:
REM   - frontend/app/offmarket/leads/[id]/edit/page.tsx
REM   - frontend/app/offmarket/leads/[id]/edit/EditLeadForm.tsx
REM   - LeadStatusActions: neuer Bearbeiten-Button
REM
REM Backend war schon ready (PATCH /me/offmarket-leads/:id mit partial Schema).
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Projektordner: %CD% ===
echo Druecke eine Taste...
pause >nul
echo.

if exist ".git\index.lock" (
    echo Lock entfernen...
    del /F /Q ".git\index.lock"
)

echo [1/3] Git-Status:
git status --short
echo.

echo [2/3] Add + Commit...
git add -A
git commit -m "feat(offmarket): Edit-Page fuer Offmarket-Inserate (Bearbeiten-Button + Edit-Form)"
echo.

echo [3/3] Push...
git push origin main
if errorlevel 1 (
    echo FEHLER push.
    pause
    exit /b 1
)

echo.
echo === FERTIG ===
echo Vercel baut neu. Teste in 1-2 Minuten:
echo   https://immodealflow-frontend.vercel.app/offmarket/leads
echo Im Detail oben rechts: Bearbeiten-Button.
echo.
pause
endlocal
