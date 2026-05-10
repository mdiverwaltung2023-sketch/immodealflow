@echo off
REM ============================================================
REM 72_rentals-l8-tenant-profile.bat
REM
REM Phase L8 — Mieter-Profil als eigene Sektion auf /profile.
REM
REM HINTERGRUND
REM   Marco-Feedback: "Das Profil musst du auch zwischen
REM   Investorprofil und Mieterprofil unterscheiden."
REM
REM AENDERUNG SCHEMA
REM   backend/prisma/schema.prisma:
REM     - Neues Model TenantProfile mit 1:1-Relation zu User.
REM     - User bekommt tenantProfile-Feld (Back-Relation).
REM     - Felder: AGG-konform — wirtschaftlich + organisatorisch
REM       + Wunschkriterien. Keine sensiblen Merkmale (Familienstand,
REM       Religion, Herkunft, Geschlecht, Alter etc.).
REM
REM   Migration 20260510220000_l8_tenant_profile:
REM     - CREATE TABLE TenantProfile mit allen Feldern
REM     - UNIQUE-Index auf userId
REM     - FK auf User ON DELETE CASCADE
REM
REM AENDERUNG BACKEND
REM   backend/src/index.ts:
REM     - GET  /me/tenant-profile  (legt bei Bedarf leer an)
REM     - PATCH /me/tenant-profile (Upsert mit Date-Konvertierung
REM       fuer desiredMoveInDate)
REM
REM AENDERUNG FRONTEND
REM   frontend/lib/api.ts:
REM     - TenantProfileSchema (Zod) + Type
REM
REM   frontend/components/ViewModeToggle.tsx:
REM     - useMemo fuer "allowed" — stabilisiert Listener-Re-Mount.
REM
REM   frontend/app/profile/page.tsx:
REM     - laedt zusaetzlich TenantProfile via apiGet
REM     - rendert ProfileSwitcher mit beiden Editor-Slots
REM
REM   frontend/app/profile/ProfileSwitcher.tsx (neu):
REM     - Client-Component, hoert auf VIEW_MODE_EVENT
REM     - TENANT-Mode -> Mieter-Editor; sonst -> Investor-Editor
REM     - Multi-Rollen sehen Hinweis-Banner mit Erklaerung
REM
REM   frontend/app/profile/TenantProfileEditor.tsx (neu):
REM     - Sektioniertes Formular: Selbstvorstellung, Wirtschaft,
REM       Haushalt, Wunschkriterien, Sichtbarkeit
REM     - AGG-Banner ganz oben
REM     - Speichern via PATCH /me/tenant-profile
REM
REM npm install ist Pflicht (Prisma-Schema-Aenderung).
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

git commit -m "feat(profile): Phase L8 Mieter-Profil als eigene Sektion (AGG-konform)"
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
echo  Phase L8 gepusht. Railway baut neu (^~2 Min, Migration laeuft),
echo  Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. /profile aufrufen — bei Investor-Sicht zeigt es das
echo       Investor-Profil (wie bisher).
echo    2. Toggle oben auf "Mieter" stellen — /profile zeigt jetzt
echo       das Mieter-Profil mit AGG-Banner und Sektionen
echo       (Wirtschaft, Haushalt, Wunschkriterien, Sichtbarkeit).
echo    3. Felder ausfuellen + Speichern — Erfolg-Indikator
echo       "Gespeichert um HH:MM" erscheint.
echo    4. Reload — Werte sind persistent.
echo    5. Reine Mieter (Rolle TENANT) sehen sofort das
echo       Mieter-Profil ohne Toggle.
echo ============================================================
echo.
pause
