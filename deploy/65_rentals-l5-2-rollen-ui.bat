@echo off
REM ============================================================
REM 65_rentals-l5-2-rollen-ui.bat
REM
REM Phase L5.2 — Rollen-UI: Vermieter überall sichtbar.
REM
REM Aenderungen:
REM
REM Backend:
REM   - backend/src/index.ts: UserRoleEnum (Zod) +LANDLORD
REM     -^> PATCH /me und /me/complete-onboarding akzeptieren jetzt
REM        die Rolle "LANDLORD".
REM
REM Frontend lib:
REM   - lib/api.ts: UserRoleEnum +LANDLORD + Label "Vermieter"
REM   - components/viewMode.ts: ViewMode-Type +LANDLORD,
REM     readViewMode/setViewMode unterstuetzen vierte Option,
REM     Label "Vermieter".
REM
REM Frontend Sidebar:
REM   - components/SideNav.tsx:
REM       - Section-Type +"landlord"
REM       - SECTION_LANDLORD neu (Mietobjekte, Mietobjekt anlegen)
REM       - SECTION_SELLER bereinigt: "Vermietung" raus, gehoert
REM         jetzt in eigene Vermieter-Sektion.
REM       - getVisibleSections-Logik komplett neu strukturiert:
REM           reine LANDLORD-User -^> nur SECTION_LANDLORD
REM           reine INVESTOR/SELLER -^> wie gehabt
REM           BOTH oder BROKER -^> Mode-abhaengig (alles bei "BOTH")
REM       - useEffect: VIEW_MODE_EVENT akzeptiert vierte Option,
REM         hydrate auch fuer BROKER (nicht nur BOTH).
REM
REM Frontend ViewModeToggle:
REM   - components/ViewModeToggle.tsx: vierte Option in OPTIONS,
REM     sichtbar fuer BOTH UND BROKER (vorher nur BOTH).
REM
REM Frontend Onboarding:
REM   - app/onboarding/OnboardingForm.tsx:
REM       - 5 Rollen-Cards: INVESTOR, SELLER, LANDLORD, BOTH, BROKER
REM       - LANDLORD-Beschreibung mit Anti-Diskriminierungs-Hinweis
REM       - Grid auf md:3-cols + xl:5-cols fuer 5 Cards
REM
REM Frontend Dashboard:
REM   - app/dashboard/LandlordView.tsx (neu): Anti-Diskriminierungs-
REM     Hinweis prominent oben, vier Quick-Actions, USP-Hinweis
REM     gegen Konkurrenten.
REM   - app/dashboard/DashboardSwitcher.tsx: rendert LandlordView
REM     bei role=LANDLORD oder (BOTH/BROKER mit viewMode=LANDLORD).
REM   - app/dashboard/page.tsx: Header-Untertext rollenabhaengig
REM     formuliert (LANDLORD: "Mietobjekte, Bewerbungen, KI-Bewertung").
REM
REM Frontend TopBar:
REM   - components/TopBar.tsx: RoleBadge bekommt LANDLORD (rosa)
REM     und BROKER (violett) mit eigenen Farb-Tones.
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

git commit -m "feat(rentals): Phase L5.2 Rollen-UI — Vermieter ueberall sichtbar (Sidebar, ViewMode, Onboarding, Dashboard)"
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
echo  Phase L5.2 gepusht.
echo  Backend: Railway baut neu (^~2 Min) — UserRoleEnum erweitert.
echo  Frontend: Vercel baut neu (^~1-2 Min).
echo
echo  Smoke-Test:
echo    1) /onboarding zeigt 5 Rollen-Cards inkl. "Vermieter"
echo    2) Wenn dein User-Plan auf BOTH/BROKER ist: TopBar-Toggle
echo       hat 4 Optionen (Beides / Investor / Verkaeufer / Vermieter)
echo    3) Sidebar bekommt eine eigene "Als Vermieter"-Sektion
echo       mit "Mietobjekte" und "Mietobjekt anlegen"
echo    4) Dashboard rendert je nach Mode die LandlordView
echo       (eigene Quick-Actions + Anti-Diskriminierungs-Hinweis)
echo
echo  Naechste Schritte:
echo    BAT 66 = L5.3 (sektionierte Inserat-Anlage v2)
echo    BAT 67 = L5.4 (Bild-Upload + Galerie)
echo    BAT 68+ = Phase L6 (oeffentliche Mietboerse + Selbstbewerbung)
echo ============================================================
echo.
pause
