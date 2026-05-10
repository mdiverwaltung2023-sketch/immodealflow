@echo off
REM ============================================================
REM 66_rentals-l5-3-form.bat
REM
REM Phase L5.3 — Sektionierte Inserat-Anlage v2 + Editor.
REM
REM Aenderungen Backend (backend/src/index.ts):
REM   - RentalUnitCreateSchema (Zod) um 22 neue Felder erweitert,
REM     damit POST/PATCH /me/rental-units die Felder akzeptiert.
REM     (Schema in Postgres ist seit BAT 64 fertig; Zod-Schema fehlte
REM     noch — sonst hätte das Backend mit "Unrecognized key" geworfen.)
REM
REM Aenderungen Frontend:
REM   - lib/api.ts: RentalUnitSchema +22 Felder (alle optional/nullable
REM     mit Defaults), damit /me/rental-units-Antworten geparst werden.
REM
REM   - components/RentalUnitForm.tsx (neu, ~600 Zeilen):
REM     Wiederverwendbare Vermieter-Inserat-Form mit 6 Sektionen:
REM       1. Eckdaten (Pflicht: Titel, Stadt, Zimmer, Wohnflaeche,
REM          Kaltmiete) + Beschreibung, Adresse, Etage
REM       2. Bausubstanz (Baujahr, Sanierung, Wohneinheiten, Baeder,
REM          Gaeste-WC)
REM       3. Aussenflaechen + Komfort (Balkon/Terrasse mit Flaeche,
REM          Garten/-anteil, Keller, Dachboden, Aufzug, Barrierefrei,
REM          Moebliert/Teilmoebliert, Einbaukueche + Abloese)
REM       4. Miete + Kaution + Stellplatz (Kaltmiete, Nebenkosten,
REM          Warmmiete, Kaution EUR, Kaution in Mieten, Stellplatz-Typ
REM          + Kosten)
REM       5. Energie (Klasse, Verbrauch, Traeger, Heizungstyp)
REM       6. Konditionen (Status, Verfuegbarkeit, Befristung,
REM          Mindestmietdauer, Haustiere tri-state, Internet
REM          tri-state + Speed, Bedingungen Freitext, Tags)
REM     Mode-Prop: "create" -^> POST /me/rental-units -^> Redirect;
REM     "edit" -^> PATCH /me/rental-units/:id -^> router.refresh().
REM
REM   - app/rentals/new/page.tsx: nutzt jetzt <RentalUnitForm
REM     mode="create" />, mit prominenten AGG-Hinweis.
REM
REM   - app/rentals/new/NewRentalUnitForm.tsx: zu reinem Re-Export
REM     reduziert (alte Imports kompatibel).
REM
REM   - app/rentals/[id]/page.tsx: zusaetzlicher Editor-Card am Ende
REM     der Detail-Seite mit <RentalUnitForm mode="edit" />, damit
REM     Marco alle Felder nachpflegen kann.
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

git commit -m "feat(rentals): Phase L5.3 sektionierte Inserat-Anlage v2 + Detail-Editor"
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
echo  Phase L5.3 gepusht. Vercel + Railway bauen neu (^~2 Min).
echo
echo  Smoke-Test:
echo    1) /rentals/new -^> 6-Section-Form mit allen Feldern
echo    2) Anlegen -^> Detail-Seite, am Ende "Inserat bearbeiten"
echo       Card mit allen Feldern, vorbefuellt
echo    3) Felder aendern -^> Speichern -^> page.refresh
echo
echo  Naechster Schritt: BAT 67 = L5.4 (Bild-Upload + Galerie
echo    auf der Detail-Seite).
echo ============================================================
echo.
pause
