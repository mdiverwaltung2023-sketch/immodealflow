@echo off
REM ============================================================
REM 33_hotfix-stripe-types.bat
REM
REM Symptom: Backend-Build scheitert auch nach BAT 32 weiter
REM (postinstall=prisma generate war richtig, aber nicht ausreichend).
REM
REM Wahrscheinlichste Ursache: Stripe-API-Version-Mismatch.
REM Im Code stand:
REM   new Stripe(secret, { apiVersion: "2025-09-30.clover" })
REM Die Stripe-Library 17.4.0 kennt diese (zukunftige) API-Version
REM nicht in ihren TypeScript-Definitionen — TS-Build wirft
REM "Type 2025-09-30.clover is not assignable to ApiVersion".
REM
REM Fix:
REM   - apiVersion bei Stripe-Constructor weglassen (Default der
REM     Library nehmen) — robuster gegen API-Version-Updates
REM   - "current_period_end"-Cast defensiver machen
REM     (as unknown as ... statt direkt as ...)
REM   - /marketplace und /marketplace/:id: owner.plan ueber den
REM     korrekt getypten Prisma-Client verwenden, ohne Hand-Casts
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

git commit -m "fix(backend): Stripe apiVersion default + saubere Type-Casts"
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
echo  Hotfix gepusht. Railway baut neu.
echo  In ~2 Minuten sollte das G4-Deployment SUCCESSFUL werden.
echo.
echo  Falls weiterhin FAILED:
echo    Railway -^> dealflow-ai-backend -^> letzter Deploy -^>
echo    Build Logs -^> erste rote Fehlerzeile (TS-Datei + Zeile)
echo    hier reinkopieren, dann fixe ich gezielt.
echo ============================================================
echo.
pause
