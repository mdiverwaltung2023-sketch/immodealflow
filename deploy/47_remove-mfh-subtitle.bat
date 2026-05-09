@echo off
REM ============================================================
REM 47_remove-mfh-subtitle.bat
REM
REM Untertitel "MFH . Gewerbe" unter dem Logo in der Sidebar
REM entfernt — sollte Kundenkreis nicht einschraenken.
REM
REM Andere Stellen mit "MFH und Gewerbe" wurden NICHT angefasst:
REM   - app/page.tsx (Landing-Headline)
REM   - components/AuthHero.tsx (Sign-In-Footer)
REM   - components/SidebarShell.tsx (App-Footer)
REM   - app/dashboard/page.tsx (Dashboard-Texte)
REM   - app/marketplace/MarketplaceHero.tsx (Hero-Text)
REM   - app/layout.tsx (Page-Title / Tab-Title / SEO)
REM   - app/onboarding/OnboardingForm.tsx (Investor-Beschreibung)
REM
REM Falls du auch da MFH/Gewerbe rauswerfen willst: einfach sagen,
REM dann gehe ich die Stellen einzeln durch.
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

git commit -m "style(brand): MFH/Gewerbe-Untertitel unter Sidebar-Logo entfernt"
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
echo  Gepusht. Vercel baut neu (^~1-2 Min).
echo ============================================================
echo.
pause
