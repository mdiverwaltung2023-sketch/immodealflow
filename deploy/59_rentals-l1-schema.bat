@echo off
REM ============================================================
REM 59_rentals-l1-schema.bat
REM
REM Phase L1 — Vermietungsplattform: Schema + Migration.
REM
REM Aenderungen in backend/prisma/schema.prisma:
REM
REM Drei neue Enums:
REM   - RentalStatus (DRAFT, AVAILABLE, RESERVED, RENTED, ARCHIVED)
REM   - ApplicationStatus (NEW, REVIEWING, VIEWING, ACCEPTED, REJECTED, WITHDRAWN)
REM   - ApplicantRating (SEHR_PASSEND, PASSEND, BEDINGT_PASSEND, EHER_UNPASSEND)
REM
REM Vier neue Modelle:
REM
REM   - RentalUnit (Mietobjekt, n:1 zu User):
REM       Eckdaten: title, description, city, district, fullAddress
REM       Wohnungs-Detail: rooms, livingArea, floor
REM       Miete: rentCold, utilities, totalRent, deposit (alle EUR)
REM       Energie: re-use EnergyClass + EnergyCarrier-Enums
REM       Status (RentalStatus), availableFrom
REM       fixedTerm + fixedTermMonths
REM       features (String-Array)
REM
REM   - RentalUnitImage (n:1 zu RentalUnit, Vercel-Blob-URLs)
REM
REM   - RentalApplication (Bewerbung, n:1 zu RentalUnit):
REM       WICHTIG: keine sensiblen Merkmale erfasst (Ethnie/Religion/
REM       Geschlecht etc.). Felder ausschliesslich organisatorisch:
REM         applicantName, email, phone
REM         monthlyNetIncome, employmentType, employmentDuration, schufaScore
REM         householdSize, hasPets, petDetails, smoker
REM         desiredMoveInDate, intendedDuration, notes
REM         status (ApplicationStatus)
REM
REM   - ApplicantEvaluation (n:1 zu RentalApplication):
REM       KI-Output:
REM         rating (ApplicantRating)
REM         summary, strengths[], risks[], openQuestions[]
REM         5 Faktor-Felder (financialStability, sizeFit, expectedDuration,
REM           reliability, communication)
REM         Handlungsempfehlungen: recommendViewing, requestDocuments, suggestFollowUp
REM         rationale, rawJson (vollstaendige Claude-Antwort fuer Audit)
REM
REM User.rentalUnits Back-Relation ergaenzt.
REM
REM Migration 20260510120000_rentals_l1/migration.sql:
REM   - 3x CREATE TYPE
REM   - 4x CREATE TABLE
REM   - alle FKs (CASCADE bei Delete)
REM   - Indizes auf ownerId, status, city, unitId+sortOrder/status etc.
REM
REM npm install ist Pflicht (Lockfile-Sync, sonst Railway "npm ci"-Fail).
REM ============================================================

cd /d "%~dp0\.."
echo.
echo === Projektordner: %CD% ===
echo.

echo === Schritt 1: npm install (Lockfile-Sync) ===
echo.

call npm install
if errorlevel 1 (
    echo.
    echo FEHLER bei npm install. Pruefe Internet / Node-Version.
    pause
    exit /b 1
)

echo.
echo === Schritt 2: Prisma Client lokal regenerieren ===
echo.

call npm run prisma:generate --workspace backend
if errorlevel 1 (
    echo.
    echo WARNUNG: prisma generate fehlgeschlagen — pruefe schema.prisma.
    pause
    exit /b 1
)

echo.
echo === Schritt 3: git ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "feat(rentals): Phase L1 Schema + Migration (RentalUnit, RentalApplication, ApplicantEvaluation)"
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
echo  Phase L1 gepusht.
echo  Railway baut neu mit "prisma migrate deploy" -^>
echo  legt RentalUnit, RentalUnitImage, RentalApplication
echo  und ApplicantEvaluation an.
echo
echo  Verifikation:
echo    Railway -^> Postgres -^> 4 neue Tabellen muessen sichtbar sein.
echo
echo  Naechster Schritt: BAT 60 = Phase L2 (lib/claude.ts +
echo    evaluateRentalApplicant mit Anti-Diskriminierungs-System-Prompt).
echo ============================================================
echo.
pause
