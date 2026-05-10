@echo off
REM ============================================================
REM 71_rentals-l7-hotfix-landlord-tab.bat
REM
REM Hotfix zu Phase L7 — Vermieter-Tab in BOTH-Toggle vergessen.
REM
REM Marco-Feedback: "Wir brauchen doch auch einen Vermieterbereich.
REM Wo ist der denn hin? Den musst du auf jeden Fall wie eben auch
REM wieder einstellen."
REM
REM Aenderung — frontend/components/viewMode.ts:
REM   Rolle BOTH bekommt jetzt ALLE 4 Sichten (Investor / Verkaeufer
REM   / Vermieter / Mieter), genau wie BROKER. Begruendung: wer
REM   "mehrere Rollen" gewaehlt hat, will auch zwischen allen vier
REM   Bereichen wechseln koennen — der Vermieter-Tab darf nicht
REM   fehlen.
REM
REM Zusaetzlich Label-Glaettung:
REM   - frontend/lib/api.ts: BOTH-Label "Investor + Verkaeufer" -> "Mehrere Rollen"
REM   - frontend/components/TopBar.tsx: RoleBadge-Fallback ebenso.
REM   - frontend/app/onboarding/OnboardingForm.tsx: BOTH-Beschreibung
REM     erklaert jetzt explizit, dass man oben zwischen allen 4
REM     Sichten umschalten kann.
REM
REM Kein Backend, kein Schema, keine Migration. Reiner Frontend-Push.
REM npm install lassen wir defensiv mitlaufen.
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
echo === Schritt 2: git ===
echo.

git status --short
echo.

git add -A
if errorlevel 1 (
    echo Fehler beim git add.
    pause
    exit /b 1
)

git commit -m "fix(roles): BOTH-Rolle bekommt Vermieter-Tab im View-Toggle"
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
echo  Hotfix gepusht. Vercel baut neu (^~2 Min).
echo
echo  Verifikation:
echo    1. Als BOTH-User einloggen — der Toggle oben zeigt jetzt
echo       4 Optionen: Investor / Verkaeufer / Vermieter / Mieter.
echo    2. Klick auf "Vermieter": Sidebar wechselt zu "Mietobjekte"
echo       + "Mietobjekt anlegen", Dashboard zeigt LandlordView.
echo    3. Falls der Tab noch nicht erscheint: Hard-Reload mit
echo       Strg+F5 (Vercel-Cache).
echo ============================================================
echo.
pause
