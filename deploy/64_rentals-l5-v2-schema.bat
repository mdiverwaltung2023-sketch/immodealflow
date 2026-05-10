@echo off
REM ============================================================
REM 64_rentals-l5-v2-schema.bat
REM
REM Phase L5.1 — Schema-Erweiterung Vermietung v2 + Rollen-Modell.
REM
REM Aenderungen in backend/prisma/schema.prisma:
REM
REM   - UserRole +LANDLORD (vierte Hauptrolle, voll gleichberechtigt
REM     zu INVESTOR/SELLER/BOTH/BROKER). Damit kann ein User sich
REM     beim Onboarding gezielt als Vermieter registrieren und das
REM     UI zeigt eine eigene Sidebar-Sektion + Vermieter-Dashboard.
REM
REM   - RentalUnit ~22 neue Felder fuer detaillierte Inserat-Anlage:
REM
REM     Bausubstanz:
REM       yearBuilt, lastRenovation, totalUnits
REM
REM     Raum-Detail:
REM       bathrooms, separateGuestWc
REM
REM     Aussenflaechen:
REM       balcony + balconyArea, terrace + terraceArea,
REM       garden + gardenShared, cellar, attic
REM
REM     Komfort:
REM       elevator, barrierFree, furnished, partlyFurnished,
REM       kitchenIncluded, kitchenBuyOut (Abloese in EUR)
REM
REM     Stellplatz:
REM       parkingType ("GARAGE"/"STELLPLATZ"/"TIEFGARAGE"/"KEINER"),
REM       parkingCost (EUR/Mon. zusaetzlich)
REM
REM     Haustiere:
REM       petsAllowed (Boolean? — null = nach Absprache),
REM       petsNote (Freitext)
REM
REM     Internet:
REM       internetAvailable (Boolean? — null = unbekannt),
REM       internetSpeed (z.B. "Glasfaser 1 Gbit")
REM
REM     Bedingungen:
REM       minRentDurationMonths, depositMonths (Kaution in
REM       Kaltmieten — z.B. 3.0), conditions (Freitext, z.B.
REM       "Nichtraucher")
REM
REM Migration 20260510160000_rentals_l5_v2_fields:
REM   - ALTER TYPE UserRole ADD VALUE 'LANDLORD'
REM   - ALTER TABLE RentalUnit ADD COLUMN ... (22 neue Spalten,
REM     alle backwards-compatible: Bool default false,
REM     Optional-Felder nullable)
REM
REM npm install ist Pflicht (Lockfile-Sync, sonst Railway "npm ci"-Fail).
REM
REM Naechste Schritte:
REM   - L5.2 (BAT 65): Rollen-UI ueberall sichtbar — SECTION_LANDLORD
REM     in Sidebar, ViewMode +Vermieter, OnboardingForm, Dashboard.
REM   - L5.3 (BAT 66): Inserat-Anlage als sektionierte Form
REM     (analog NewListingForm v2).
REM   - L5.4 (BAT 67): Bild-Upload + Galerie auf Detail-Page.
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

git commit -m "feat(rentals): Phase L5.1 Schema v2 (22 neue Felder + UserRole LANDLORD)"
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
echo  Phase L5.1 gepusht. Railway baut neu (^~2 Min).
echo  RentalUnit-Tabelle bekommt 22 neue Spalten,
echo  UserRole-Enum bekommt LANDLORD-Wert.
echo
echo  Verifikation: Railway -^> Postgres -^> RentalUnit-Tabelle
echo  zeigt die neuen Spalten (yearBuilt, bathrooms, balcony, ...).
echo
echo  Naechster Schritt: BAT 65 = L5.2 Rollen-UI sichtbar machen.
echo ============================================================
echo.
pause
