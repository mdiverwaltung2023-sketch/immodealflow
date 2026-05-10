@echo off
REM ============================================================
REM 61_rentals-l3-endpoints.bat
REM
REM Phase L3 — Backend-Endpoints fuer Vermietungsplattform.
REM Alle ownership-gefiltert (RentalUnit.ownerId == req.userId).
REM
REM Aenderungen in backend/src/index.ts:
REM
REM Imports: evaluateRentalApplicant, RentalUnitInput,
REM RentalApplicantInput aus lib/claude.js
REM
REM Zod-Enums + Schemas:
REM   RentalStatusEnum, ApplicationStatusEnum
REM   RentalUnitCreateSchema / RentalUnitPatchSchema
REM   RentalApplicationCreateSchema / RentalApplicationPatchSchema
REM
REM Helpers:
REM   rentalUnitToInput, rentalApplicationToInput  — Mapping fuer Claude
REM   ownedApplication  — Ownership-Check via Unit.ownerId
REM
REM Endpoints:
REM
REM   GET    /me/rental-units                  Liste + ?status= Filter
REM   POST   /me/rental-units                  Anlegen (Default DRAFT)
REM   GET    /me/rental-units/:id              Detail mit Bildern
REM   PATCH  /me/rental-units/:id              Felder updaten
REM   DELETE /me/rental-units/:id              Cascade
REM   POST   /me/rental-units/:id/images       URL registrieren
REM   DELETE /me/rental-units/:unitId/images/:imageId
REM
REM   GET    /me/rental-units/:unitId/applications     Bewerber-Liste
REM   POST   /me/rental-units/:unitId/applications     Bewerber anlegen
REM   GET    /me/rental-applications/:id               Detail mit eval-History
REM   PATCH  /me/rental-applications/:id                Update (Status etc.)
REM   DELETE /me/rental-applications/:id
REM
REM   POST   /me/rental-applications/:id/evaluate      KI-Bewertung
REM     -^> ANTHROPIC_API_KEY noetig (sonst 503)
REM     -^> persistiert in ApplicantEvaluation
REM     -^> rawJson + model als Audit-Snapshot
REM   GET    /me/rental-applications/:id/evaluations   History (max 20)
REM
REM Keine neuen Dependencies, kein npm install.
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

git commit -m "feat(rentals): Phase L3 Backend-Endpoints (CRUD + KI-Bewertung)"
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
echo  Phase L3 gepusht. Railway baut neu (^~2 Min).
echo
echo  Smoke-Test (REST-Client mit Clerk-Token):
echo    POST /me/rental-units  body { title, city, rooms,
echo      livingArea, rentCold }
echo    POST /me/rental-units/^<id^>/applications
echo      body { applicantName, monthlyNetIncome, ... }
echo    POST /me/rental-applications/^<appId^>/evaluate
echo      -^> KI-Antwort mit rating, summary, strengths,
echo         risks, recommendViewing, etc.
echo
echo  Naechster Schritt: BAT 62 = Phase L4 (Frontend — /rentals
echo    Liste, /rentals/[id] Detail mit Bewerbern und KI-Bewertungen,
echo    Sidebar-Eintrag).
echo ============================================================
echo.
pause
