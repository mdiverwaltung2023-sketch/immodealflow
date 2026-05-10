@echo off
REM ============================================================
REM 67_rentals-l5-4-bilder.bat
REM
REM Phase L5.4 — Bild-Upload + Galerie auf Mietobjekt-Detail.
REM Damit ist Phase L5 (L5.1-L5.4) komplett.
REM
REM Aenderungen:
REM
REM   - frontend/app/rentals/[id]/RentalUnitImageManager.tsx (neu, ~290 Zeilen):
REM       - Drag-and-Drop-Upload-Zone (mehrere Files moeglich)
REM       - File-Picker als Alternative
REM       - Per-File-Validation (Bild-Typ, max 4 MB)
REM       - Sequentieller Upload mit Progress-Bar (done/total)
REM       - Galerie-Grid (4-spaltig auf lg) mit:
REM           Cover-Badge auf erstem Bild
REM           Loesch-Button (hover-revealed)
REM           Beschriftung unter dem Bild
REM       - Lightbox-Vorschau mit Vor-/Zurueck-Pfeilen
REM       Upload-Flow analog zum Verkaufs-Listing:
REM         File -^> POST /api/upload-image (Vercel Blob)
REM         URL -^> POST /me/rental-units/:id/images (Backend-Eintrag)
REM       Loeschen via DELETE /me/rental-units/:unitId/images/:imageId.
REM       Nach jedem Upload/Delete -^> router.refresh() (damit
REM       andere Server-Components wie die Listings-Karten den
REM       neuen Cover-Bild bekommen).
REM
REM   - frontend/app/rentals/[id]/page.tsx:
REM       Statische Bilder-Galerie ersetzt durch interaktive
REM       <RentalUnitImageManager />.
REM
REM Voraussetzung: BLOB_READ_WRITE_TOKEN in Vercel-ENV (war eh schon
REM fuer Verkaufs-Bilder + Sales-Documents noetig).
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

git commit -m "feat(rentals): Phase L5.4 Bild-Upload mit Drag-and-Drop + Lightbox-Galerie"
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
echo  Phase L5.4 gepusht — Phase L5 (L5.1-L5.4) komplett.
echo  Vercel baut neu (^~1-2 Min).
echo
echo  Smoke-Test:
echo    1) /rentals/^<id^> oeffnen
echo    2) Bilder per Drag-and-Drop in die Zone ziehen
echo       ODER per "Datei waehlen"-Button hochladen
echo    3) Galerie zeigt Cover-Badge + Loesch-Button (hover)
echo    4) Bild anklicken -^> Lightbox mit Pfeil-Navigation
echo    5) Loeschen -^> nach Bestaetigung sofort weg
echo    6) Auf /rentals (Liste) -^> Cover-Bild ist sichtbar
echo
echo  Naechste Phase: L6 = oeffentliche Mietboerse +
echo  Selbstbewerbungs-Form fuer Mieter (Bewerber tragen Daten
echo  selbststaendig ein, nicht der Vermieter manuell).
echo ============================================================
echo.
pause
