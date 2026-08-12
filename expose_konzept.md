# Konzept: Das intelligente Exposé — Oikos Top-Feature

_Stand: 2026-08-12 · Ziel: ein Exposé, das stärker ist als jedes Konkurrenz-Exposé am Markt, mit überragender Druckqualität als oberster Priorität._

---

## 1. Positionierung — warum es überlegen ist

Klassische Makler-Exposés (Immoscout-PDF, McMakler, Engel & Völkers-Broschüre) beantworten genau eine Frage: **„Wie sieht das Objekt aus?"** Sie sind hübsche Bild-Broschüren mit ein paar Eckdaten. Ihnen fehlt, was eine Kaufentscheidung wirklich auslöst.

Das Oikos-Exposé beantwortet **drei Fragen, die den Verkauf abschließen**:

> **Lohnt es sich?** — belegt durch eine KI-Investment-These aus euren Marktdaten.
> **Kann ich es finanzieren?** — beweisbar durch einen Live-Finanzierungsrechner mit echten Kennzahlen.
> **Wo unterschreibe ich?** — durch einen sicheren, eingebetteten Datenraum ohne Käufer-Account.

Der Vorsprung entsteht nicht durch schöneres Design allein, sondern weil Oikos etwas besitzt, das kein Makler-Exposé hat: **strukturierte Objekt-, Markt- und Finanzierungsdaten** (`MarketAnalysis`, `financing.ts`, `calc.ts`) plus einen **KI-Textgenerator**. Design + Daten + KI = ein Dokument, das argumentiert statt nur zeigt.

---

## 2. Das Erlebnis — dual: interaktiv am Bildschirm, überragend im Druck

Ein einziges Artefakt, zwei perfekte Zustände:

**Am Bildschirm** (teilbare Web-Seite unter eurer Marke, ohne Käufer-Login): Bildergalerie, Karte/Lage, interaktiver Finanzierungsrechner (Eigenkapital-Slider → Rate, Cashflow, DSCR live), aufklappbarer Datenraum. Ein Erlebnis, das sich premium anfühlt.

**Im Druck / als PDF** (oberste Priorität): dieselbe Seite rendert per `@media print` zu einem **magazinreifen A4-Dokument** — Vollflächen-Titelbild, saubere Typografie, kontrollierte Seitenumbrüche, farbechte Diagramme und Badges. Der Finanzierungsrechner „friert" beim Druck auf ein klares Szenario-Blatt mit den aktuell eingegebenen Werten ein. Kein zweites System, keine Layout-Abweichung zwischen Screen und Papier.

---

## 3. Druck-Exzellenz als technisches Kern-Prinzip

Weil der Ausdruck Priorität Nr. 1 ist, ist die Rendering-Weichenstellung die wichtigste Entscheidung im ganzen Feature.

**Weg: Print-perfektes HTML + CSS `@media print` → Browser „Als PDF speichern".** Genau das Muster, das ihr in der Finanzierungsmappe bereits erfolgreich einsetzt (`finanzierungsmappe/page.tsx`, `PrintButton.tsx`): `@page { margin }`, `break-before-page`, `break-inside-avoid`, `print-color-adjust: exact`, Sichtbarkeits-Umschaltung auf den Exposé-Container.

Warum dieser Weg dem heutigen Generator und den Alternativen überlegen ist:

- **vs. `exposePdf.ts` (pdfkit heute):** pdfkit zeichnet Kästchen und Text zu Fuß — gut für ein Datenblatt, chancenlos für ein Magazin-Layout mit Vollbild-Cover, Rasterspalten und Web-Fonts. Bleibt als schlanker Fallback erhalten, ist aber nicht das Top-Produkt.
- **vs. Server-Chromium (Puppeteer):** würde pixelgenaues PDF liefern, bricht aber euer bewusst Chromium-freies, Railway-taugliches Setup (`exposePdf.ts`-Kommentar) und bringt Deploy-Risiko. Erst nötig, wenn ihr später serverseitig gebrannte PDFs per Link ohne Browserdruck verschicken wollt — als spätere Ausbaustufe planbar, nicht für den Start.
- **vs. HTML+Print (gewählt):** volle Design-Freiheit (Tailwind, Web-Fonts, SVG-Charts), Screen und Druck aus **einer** Quelle, null neue Infrastruktur, sofort auf Vercel lauffähig.

**Druck-Design-Standards, die den Unterschied machen:**

- Echtes A4-Raster, definierte Ränder (`@page { margin: 1.4cm }`), bewusste Seitenumbrüche pro Sektion.
- Vollflächen-Titelseite mit Cover-Bild, Objekttitel, Lage, Preis und eurem Logo/Marke.
- Hochwertige Typografie (eine Display-Schrift für Titel, eine gut lesbare Grotesk für Fließtext), großzügiger Weißraum.
- Farbechte Kennzahlen-Badges, Ampeln und Charts (`print-color-adjust: exact`), damit Rendite/DSCR auch auf Papier knallen.
- Kein „App-Chrome" im Druck (Navigation, Buttons via `.no-print` ausgeblendet).
- Kopf-/Fußzeile mit Objekt-Kurzname, Seitenzahl und optionalem Vertraulichkeitshinweis.

---

## 4. Inhalt & Aufbau des Exposés (adaptiv Investor / Privat)

Das Exposé passt Ton und Reihenfolge an den Objekt-/Zielgruppentyp an (`propertyType`, `buyerSegments` aus `MarketAnalysis`). Investoren sehen Zahlen zuerst, Eigennutzer Emotion und Lage zuerst — gleiche Sektionen, andere Gewichtung.

1. **Titelseite** — Cover-Bild, Objekttitel, Lage (anonymisierbar via `anonymizationLevel`), Preis, Marke.
2. **Auf einen Blick** — Eckdaten-Kacheln (Fläche, Einheiten, Baujahr, Energieklasse, Soll-/Ist-Miete, Provision).
3. **KI-Investment-These (Wow #1)** — automatisch generierter, datenbelegter Fließtext: „Warum dieses Objekt" — Stärken, Upside (`rentUpsidePotential`, `modernizationBacklog`), Marktposition, Risiken ehrlich benannt. Adaptiv: Investoren-Version (Rendite/Cashflow-Argumentation) vs. Eigennutzer-Version (Lage/Lebensgefühl/Ausstattung).
4. **Bildergalerie** — im Screen Karussell, im Druck sauberes Foto-Raster.
5. **Lage & Umfeld** — Karte, Distrikt-Beschreibung, Infrastruktur.
6. **Live-Finanzierungsrechner (Wow #2)** — Eigenkapital-Eingabe → Rate, Cashflow, DSCR, LTV, Objekt-Score aus `financing.ts`/`calc.ts`. Im Druck als fixiertes „Ihr Finanzierungs-Szenario"-Blatt mit Ampel und Kennzahlen.
7. **Marktvergleich** — Preis-Positionierung gegen Vergleichswerte (`MarketAnalysis.priceConservative/Fair/Premium`), sichtbar als Range-Balken.
8. **Sicherer Datenraum (Wow #3)** — im Screen eingebettete, token-basierte Dokumentenfreigabe (`BuyerDocAccess`, inkl. der neuen Kategorien Gebäudeversicherung / Nebenkostenabrechnung / Grundsteuerbescheid); im Druck eine übersichtliche Dokumenten-Checkliste („diese Unterlagen liegen vor").
9. **Nächster Schritt / Kontakt** — klarer CTA, Ansprechpartner, QR-Code zur Online-Version.

---

## 5. Datenfundament — alles schon vorhanden

| Exposé-Baustein | Quelle im Code |
|---|---|
| Objektdaten, Bilder, Highlights, Features | `Listing`, `ListingImage` (`schema.prisma`) |
| KI-Investment-These (Text) | neuer Tool-Use `generate_expose_copy` nach Muster `callWithTool` + `listingDataAsBriefing()` (`claude.ts`) |
| Marktposition, Zielgruppen, Risiken | `MarketAnalysis` (`priceFair`, `buyerSegments`, `risks`, `summary`) |
| Finanzierungskennzahlen (DSCR/LTV/Cashflow/Score) | `financing.ts` (`computeFinancingReadiness`), `calc.ts` (`computeFullAnalysis`) |
| Datenraum / Dokumentenfreigabe | `BuyerDocAccess`, `GET /public/buyer-access/:token`, `SALE_DOC_ORDER/LABELS` |
| Anonymisierung | `anonymizationLevel`, `listingPublicView()` / `anonymizeListing()` |
| Print-Muster | `finanzierungsmappe/page.tsx`, `PrintButton.tsx` |
| Bild-Upload | Vercel Blob (`upload-image.ts`, `/api/blob-upload`) |

Nur **ein** wirklich neuer Baustein ist nötig: der KI-Textgenerator für die Investment-These. Alles andere ist Komposition vorhandener Teile.

---

## 6. Architektur

**Backend**
- Neuer KI-Tool-Use `generateExposeCopy(listing, audience)` in `claude.ts` → liefert strukturiert: `headline`, `investmentThesis`, `strengths[]`, `risks[]`, `locationNarrative`, `callToAction`. Zwei Tonalitäten (investor/owner).
- Neuer Endpunkt `POST /me/listings/:id/expose/copy` (generiert & cached Text) und `GET /public/expose/:token` (öffentliche, tokenbasierte Exposé-Daten inkl. Finanzierungs- & Datenraum-Payload — analog `buyer-access`).
- Optionales additives Model `ExposeConfig` (pro Listing: Zielgruppen-Modus, freigeschaltete Sektionen, generierter Text-Cache, Marken-/Vertraulichkeitsoptionen). Additiv, keine bestehenden Daten betroffen.
- `exposePdf.ts` bleibt als Fallback; wird nicht das Hauptprodukt.

**Frontend**
- Neue Route `frontend/app/expose/[token]/page.tsx` (Server-Component, `force-dynamic`, tokenbasiert, kein Login) — analog `zugang/[token]`.
- Feature-lokale Komponenten daneben: `Cover.tsx`, `Sections.tsx`, `FinanceCalculator.tsx` (Client, interaktiv + druck-fixierbar), `Charts.tsx` (SVG, druckfarbecht), `DataRoom.tsx`, `PrintButton.tsx`, `print.css`/`<style>`-Block.
- Verkäufer-Steuerung: „Exposé"-Tab/Button im Inserats-Bereich (`app/sales/[id]` oder `listings/[id]/edit`) — Zielgruppe wählen, Text generieren/bearbeiten, Vorschau, Link teilen, „Drucken / als PDF".

**Kein Bruch:** neue Routen unter `/public/*` und `/me/*` fügen sich ins bestehende Auth-Muster; Blob, Anonymisierung, Datenraum werden wiederverwendet.

---

## 7. Phasenplan

**Phase 1 — Print-Fundament & Layout (der sichtbare Wow-Effekt).**
Statische, druck-perfekte Exposé-Seite aus echten Listing-Daten: Titelseite, Eckdaten, Galerie, Lage, Kontakt. Volles `@media print`-A4-Layout, Typografie, farbechte Badges, `PrintButton`. Ergebnis: ein Ausdruck, der jedes Konkurrenz-PDF schlägt — noch ohne KI/Rechner.

**Phase 2 — KI-Investment-These.**
`generate_expose_copy`-Tool + Endpunkt + Verkäufer-UI zum Generieren/Editieren. Adaptiver Ton Investor/Eigennutzer. Text fließt in Screen und Druck.

**Phase 3 — Live-Finanzierungsrechner.**
Interaktive Eingabe am Screen, druck-fixiertes Szenario-Blatt. Kennzahlen aus `financing.ts`/`calc.ts`, SVG-Charts farbecht.

**Phase 4 — Eingebetteter Datenraum + Teilen.**
`BuyerDocAccess` in die Exposé-Seite integrieren, tokenbasierter öffentlicher Link, QR-Code, Marktvergleich-Balken, Vertraulichkeits-/Anonymisierungsoptionen.

**Phase 5 (optional, später) — Serverseitiges PDF per Link.**
Wenn gewünscht: gebranntes PDF ohne Browserdruck verschicken (Chromium-Renderer als isolierter Service) — nur falls der Bedarf entsteht.

---

## 8. Was den Wettbewerb schlägt — in einem Satz

Konkurrenz-Exposés sind gedruckte Bildbroschüren; das Oikos-Exposé ist ein gedrucktes **Verkaufsargument** — mit KI-These, beweisbarer Finanzierbarkeit und sicherem Datenraum, in einer Druckqualität, die aus einer einzigen, screen- und papieridentischen Quelle entsteht.
