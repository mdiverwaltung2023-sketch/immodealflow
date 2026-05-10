@echo off
REM ============================================================
REM 68_rentals-l6-1-marketplace-backend.bat
REM
REM Phase L6.1 — Oeffentliche Mietboerse: Schema + Backend.
REM
REM Aenderungen Schema (backend/prisma/schema.prisma):
REM   - RentalApplication.applicantUserId (String?, FK auf User)
REM       Bei manueller Vermieter-Eintragung: null.
REM       Bei Selbstbewerbung ueber Mietboerse: User.id.
REM   - User.rentalApplicationsSent (Back-Relation)
REM
REM Migration 20260510200000_rentals_l6_applicant_user:
REM   - ADD COLUMN applicantUserId
REM   - INDEX + FK ON DELETE SET NULL
REM
REM Aenderungen Backend (backend/src/index.ts):
REM   - app.use("/rental-marketplace", requireAuth)
REM
REM   - GET  /rental-marketplace
REM       Filter: city, roomsMin, rentMax, areaMin, furnished,
REM         petsAllowed, barrierFree
REM       Liefert AVAILABLE-Mietobjekte (max 100), fullAddress
REM       wird aus der Antwort entfernt (Anonymisierung).
REM       Inkl. images (max 5) + owner-Mini.
REM
REM   - GET  /rental-marketplace/:id
REM       Detail-Page-Daten + "myApplication" (falls der
REM       eingeloggte User schon beworben ist).
REM
REM   - POST /rental-marketplace/:unitId/apply
REM       Selbstbewerbungs-Endpoint.
REM       Body: applicantName + alle organisatorisch/wirtschaftlichen
REM         Felder (KEINE sensiblen Merkmale moeglich).
REM       Self-bewerbung des Eigentuemers wird blockiert (400).
REM       Bei erneuter Bewerbung: Update statt Create + Status-Reset
REM         auf NEW (Vermieter sieht es als frisch).
REM       applicantUserId wird automatisch auf req.userId gesetzt.
REM
REM   - GET  /me/applications-sent
REM       Liste aller eigenen gestellten Bewerbungen mit Mietobjekt-
REM       Mini (inkl. erstem Bild fuer Cover).
REM
REM npm install ist Pflicht (Lockfile-Sync).
REM
REM Naechster Schritt: BAT 69 = L6.2 Frontend (Marketplace-Seite,
REM Detail mit Bewerbungs-Modal, "Meine Bewerbungen"-Page).
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

git commit -m "feat(rentals): Phase L6.1 oeffentliche Mietboerse + Selbstbewerbung (Backend)"
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
echo  Phase L6.1 gepusht. Railway baut neu (^~2 Min).
echo
echo  Verifikation:
echo    Railway -^> Postgres -^> RentalApplication zeigt neue Spalte
echo    "applicantUserId" mit FK auf "User".
echo
echo  Naechster Schritt: BAT 69 = L6.2 Frontend.
echo ============================================================
echo.
pause
