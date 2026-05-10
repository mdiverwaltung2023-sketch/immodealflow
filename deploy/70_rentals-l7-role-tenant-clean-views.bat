@echo off
REM ============================================================
REM 70_rentals-l7-role-tenant-clean-views.bat
REM
REM Phase L7 — Klare Rollen-Trennung + neue Rolle TENANT (Mieter).
REM
REM HINTERGRUND
REM   Marco-Feedback: "In der Verkaeufer- und Investor-Sicht sollten
REM   keine Vermiet- oder Miet-Features auftauchen. Oben sollte ein
REM   Toggle 'Mieter' stehen. Die Rolle Mieter gibt es noch gar nicht.
REM   Den Toggle 'Beides' kann man wegnehmen — wenn man oben switchen
REM   kann, bringt das eh keinen Mehrwert."
REM
REM AENDERUNG SCHEMA
REM   backend/prisma/schema.prisma:
REM     - enum UserRole bekommt Wert TENANT.
REM   Migration 20260510210000_l7_role_tenant:
REM     - ALTER TYPE "UserRole" ADD VALUE 'TENANT';
REM
REM AENDERUNG BACKEND
REM   backend/src/index.ts:
REM     - UserRoleEnum (Zod) +TENANT.
REM
REM AENDERUNG FRONTEND
REM   frontend/lib/api.ts:
REM     - UserRoleEnum +TENANT.
REM     - USER_ROLE_LABELS: BOTH heisst jetzt klar "Investor + Verkaeufer",
REM       TENANT = "Mieter".
REM
REM   frontend/components/viewMode.ts (komplett neu):
REM     - ViewMode-Type kennt nur noch "INVESTOR" | "SELLER" |
REM       "LANDLORD" | "TENANT". Kein "BOTH" mehr.
REM     - Helper getAllowedModes(role) und readViewModeFor(role) —
REM       Legacy-Wert "BOTH" im localStorage wird automatisch auf den
REM       Default der Rolle zurueckgesetzt.
REM
REM   frontend/components/ViewModeToggle.tsx:
REM     - Optionen kommen jetzt aus getAllowedModes(role).
REM     - Reine Rollen sehen den Toggle gar nicht.
REM     - BOTH bekommt 3 Optionen (Investor/Verkaeufer/Mieter),
REM       BROKER alle 4 (zusaetzlich Vermieter).
REM
REM   frontend/components/SideNav.tsx:
REM     - getVisibleSections nutzt jetzt nur den effektiven Mode.
REM     - INVESTOR-View zeigt NUR Investor-Section + Konto.
REM     - SELLER-View zeigt NUR Verkaeufer-Section + Konto.
REM     - LANDLORD-View zeigt NUR Vermieter-Section + Konto.
REM     - TENANT-View zeigt NUR "Wohnung mieten (suchen)" + Konto.
REM     - Keine Doppelanzeige mehr.
REM
REM   frontend/components/TopBar.tsx:
REM     - RoleBadge kennt TENANT (cyan).
REM     - Mobile-Toggle wird auch fuer BROKER gerendert (war nur BOTH).
REM
REM   frontend/app/onboarding/OnboardingForm.tsx:
REM     - 6. Karte "Mieter" mit Beschreibung.
REM     - Grid: xl:grid-cols-6.
REM
REM   frontend/app/dashboard/TenantView.tsx (neu):
REM     - Quick-Actions Mietboerse / Meine Bewerbungen / Profil.
REM     - USP-Hinweis warum Bewerben hier strukturierter ist.
REM
REM   frontend/app/dashboard/DashboardSwitcher.tsx:
REM     - Saubere Mode-basierte Switch-Logik.
REM     - TENANT -> TenantView, sonst wie gehabt.
REM
REM npm install ist Pflicht (Lockfile-Sync wegen Prisma-Schema-Aenderung).
REM
REM Naechster Schritt offen — z.B. L8 Vermieter-Inbox "Wer hat sich
REM beworben?" oder L8 Mieter-Profil mit verifiziertem Bonitaets-Badge.
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

git commit -m "feat(roles): Phase L7 saubere Rollen-Trennung + neue Rolle TENANT"
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
echo  Phase L7 gepusht. Railway baut neu (^~2 Min, Migration laeuft),
echo  Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. Onboarding (z.B. neuer Test-User) zeigt 6 Rollen-Karten
echo       inkl. "Mieter".
echo    2. Wer "Mieter" auswaehlt: sieht im Dashboard die Mieter-Sicht,
echo       kein Investor-/Verkaeufer-Kram, Sidebar nur "Mietboerse" +
echo       "Meine Bewerbungen" + "Konto".
echo    3. Wer reiner "Investor" ist: sieht NUR Investor-Sektion,
echo       KEINE Vermieter- oder Mieter-Features.
echo    4. Wer "Investor + Verkaeufer" (BOTH) ist: oben Toggle mit
echo       drei Optionen (Investor/Verkaeufer/Mieter). Klick wechselt
echo       Sidebar + Dashboard. KEIN "Beides"-Toggle mehr.
echo    5. Makler (BROKER): oben Toggle mit allen 4 Optionen.
echo
echo  Falls noch ein "Beides"-Toggle erscheint: Browser-Cache leeren
echo  oder Hard-Reload (Strg+F5) — localStorage-Wert "BOTH" wird beim
echo  ersten Laden automatisch normalisiert.
echo ============================================================
echo.
pause
