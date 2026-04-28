# PROJECT STATE — DealFlow AI (ImmoDealFlow)

> Stand: **2026-04-26**. Diese Datei ist die Single Source of Truth für den
> aktuellen Projektstand. Bei jeder substanziellen Änderung (neuer Endpoint,
> neuer Deploy, neuer Bug, Status-Update) hier nachziehen.

---

## 🔑 WIE CLAUDE IN DIE APP KOMMT (IMMER ZUERST LESEN)

### URLs

| Service    | URL                                               | Status |
|------------|---------------------------------------------------|--------|
| Frontend   | https://immodealflow-frontend.vercel.app | ✅ live |
| Backend    | https://dealflow-ai-backend-production.up.railway.app | ✅ live |
| Health     | https://dealflow-ai-backend-production.up.railway.app/health → `{"ok":true}` | ✅ |
| GitHub-Repo | https://github.com/mdiverwaltung2023-sketch/immodealflow | ✅ |

> **Sobald deployt** hier die echten URLs eintragen, damit Claude direkt darauf
> zugreifen kann.

### Lokaler Zugang (jetzt)

```
Backend:  http://localhost:4000  (Health: /health)
Frontend: http://localhost:3000
```

Start: `deploy\04_dev-start.bat` doppelklicken.

### Test-Reihenfolge nach Deploy

1. **Health-Check:** `GET <backend>/health` → erwartet `{"ok":true}` →
   bestätigt, dass Build + Start durchlief.
2. **Property anlegen:** `POST <backend>/properties` mit Test-Payload.
3. **Analyse:** `POST <backend>/analyze/<id>` → erwartet `grossYield`,
   `cashflow`, `score`.
4. **Angebot:** `POST <backend>/offer/<id>` → erwartet `suggested_price`,
   `message` (Claude-Call, dauert 2–5 s).
5. **Frontend:** Vercel-URL aufrufen → Dashboard, "Neues Objekt"-Flow
   end-to-end klicken.

---

## Projekt

**DealFlow AI** — MVP zur Analyse von Immobilien-Deals.

User legt ein Objekt an (Preis, Miete, Lage, Größe), bekommt eine
heuristische Analyse (Bruttorendite, Cashflow, Score 0–100) und einen
KI-generierten Kaufpreisvorschlag + Anschreiben an den Verkäufer (Claude).

**Ziel der nächsten Phase:** echte Deal-Pipeline — Status, Notizen, mehrere
Analysen pro Objekt, realistischere Finanzkalkulation.

## Architektur

- **Frontend:** Next.js 14 (App Router) + React 18 + Tailwind 3 + Zod (`frontend/`)
- **Backend:** Node.js + Express 5 + Prisma 6 + Zod, TypeScript ESM (`backend/`)
- **DB:** PostgreSQL (Railway, später)
- **KI:** Anthropic API (`@anthropic-ai/sdk` 0.70), Modell `claude-3-5-sonnet-latest`
- **Hosting:** Backend → Railway, Frontend → Vercel
- **Monorepo:** npm workspaces

Keine Auth, kein Multi-Tenant — bewusst minimal fürs MVP.

## Datenmodell (Prisma)

```prisma
Property { id, createdAt, updatedAt, title, price, rent, location, size }
   ↓ 1:1
Analysis  { id, createdAt, propertyId, grossYield, cashflow, score }
   ↓ 1:1
Offer     { id, createdAt, propertyId, suggestedPrice, message, model? }
```

Quelle: `backend/prisma/schema.prisma`.

## Backend-Endpunkte

| Methode | Pfad                | Zweck                                                  |
|---------|---------------------|--------------------------------------------------------|
| GET     | `/health`           | Healthcheck                                            |
| GET     | `/properties`       | Liste aller Properties                                 |
| POST    | `/properties`       | Property anlegen (Zod-validiert)                       |
| GET     | `/properties/:id`   | Detail inkl. `analysis` + `offer`                       |
| POST    | `/analyze/:id`      | Heuristische Analyse berechnen + speichern (upsert)    |
| POST    | `/offer/:id`        | Claude-Call für Preisvorschlag + Anschreiben (upsert)  |

Quelle: `backend/src/index.ts`.

## Frontend-Routen

| Pfad                  | Zweck                                                  |
|-----------------------|--------------------------------------------------------|
| `/`                   | Redirect → `/dashboard`                                |
| `/dashboard`          | Liste aller Properties + Buttons "Analysieren" / "Angebot generieren" |
| `/new`                | Formular: neues Objekt anlegen                         |
| `/property/[id]`      | Detail-Seite: Stats + Analyse + Angebot                |

UI-Primitives: `frontend/components/ui.tsx` (Card, Button, Input, Label, Stat).

## Aktuelle Phase: **Phase 1 (Versteigerungen) erledigt — ZVG-Importer + Bietlimit live**

### Phase 1 (2026-04-28)

- ✅ Prisma: neuer Enum `DealType` (FREE_SALE/AUCTION), `AuctionType` (ZVG/DGA/SDL/KARHAUSEN/OTHER), `Property.dealType`, neues Model `AuctionInfo` (1:1) mit Aktenzeichen, Verkehrswert, Termin, Amtsgericht, Source-URL, RawText, Bietlimit, Notes
- ✅ Migration `20260427xxxxxx_add_auctions` auf Railway-DB
- ✅ Calc-Lib: `computeBidLimit(rent, assumptions, target=0)` — Bisektion zwischen 0 und 50× Bruttojahresmiete, findet Max-Preis bei Cashflow nach Steuer ≥ 0
- ✅ Claude: neuer Tool-Use `extract_auction` für ZVG-Bekanntmachungen (Aktenzeichen, Verkehrswert, Termin ISO, Adresse, Größe, Miete, Auktionstyp, Notes)
- ✅ PDF-Parser: `pdf-parse@1.1.1` mit eigener Type-Shim `backend/src/types/pdf-parse-lib.d.ts` (Sub-Pfad-Import wegen Test-Side-Effect im Hauptmodul)
- ✅ Backend-Endpoints: `POST /import/auction` (Body `{text}` ODER `{pdfBase64}` ODER `{url}`), `POST /properties/:id/recompute-bid-limit`. Importiert legt Property mit `dealType=AUCTION` + AuctionInfo + Standard-Analyse + Bietlimit an. Startpreis = 70 % Verkehrswert (Zuschlagsschwelle).
- ✅ Frontend: neue Page `/auctions` mit Sortierung anstehend → ohne Termin → vergangen, Spalten Termin/Objekt/Lage/Verkehrswert/Bietlimit/Aktenzeichen/Typ. Page `/auctions/import` mit drei Tabs (Text/PDF/URL). Auction-Card auf Property-Detail mit Termin-Banner (rot wenn ≤ 14 Tage), Verkehrswert, Bietlimit prominent grün, Aktenzeichen, „Bietlimit neu berechnen"-Button.
- ✅ Production-Smoke-Test: Beispiel-ZVG „Köln-Ehrenfeld, 90 K 142/24" → korrekte Extraktion, Bietlimit 107.578 € bei 720 € Miete, Termin 17.06.2026, Notes mit Mieterschutz § 57a ZVG / Hausgeld / Geringstes Gebot 5/10 / Zuschlag ab 7/10
- ⚠️ Bekannt: Zeitzone der `auctionDate` wird als UTC gespeichert, im Browser mit +2 h CEST angezeigt (09:30 UTC → 11:30 CEST). Fix später: Europe/Berlin als Default beim Parsen.

### Roadmap nach Phase 1

- **Phase 2** Versteigerungen — DGA + SDL Crawler (Auktionskataloge der Online-Versteigerer)
- **Phase 3** Versteigerungen — Universal-Bookmarklet für jedes Inserat-Portal
- **Finanzierung Stufe 1** — Bonitäts-Selbsteinschätzung (max Darlehen aus Einkommen + EK + Verbindlichkeiten), automatischer Filter „leistbare Properties" im Dashboard

## Aktuelle Phase: **Block C erledigt — KI-Magie live**

### Block C (2026-04-27)

- ✅ `claude.ts` refactored: Helper `callWithTool` zwingt strukturierte Antworten via `tool_choice`. Drei Use-Cases: `generateOfferWithClaude` (Tool `propose_offer`), `extractPropertyFromText` (Tool `extract_property`), `marketComparisonForProperty` (Tool `market_comparison`). Kein freies JSON-Parsing mehr.
- ✅ Prisma: neuer Enum `MarketRating` (below_market/fair/above_market), neues Model `MarketComparison` (1:1 Property), Migration `20260427xxxxxx_market_comparison`
- ✅ Backend: POST `/import/expose` (Body `{text}` → extrahierte Felder), POST `/properties/:id/market-comparison` (upsert, gibt `MarketComparison` zurück), GET `/properties/:id` liefert jetzt auch `marketComparison`
- ✅ Frontend: neue Card „Schnell-Import aus Inserat" auf `/new` mit Textarea + Import-Button → Form-Felder werden vorbefüllt; neue Card „Marktvergleich (Claude)" auf Property-Detail mit m²-Spannen, Eigenwert-Vergleich, Rating-Badge, Rationale, Daten-Caveat
- ✅ Production-Smoke-Test bestanden: Hamburg-Eimsbüttel-Inserat → korrekte Extraktion mit Konfidenz „high"; München-Marktvergleich → realistische Spannen 8.500–11.500 €/m² Kaufpreis, 20–28 €/m² Miete, Bewertung „below_market"; Offer mit Tool-Use → strukturierte Antwort 420 k EUR

## Aktuelle Phase: **Block B erledigt — Finanzielle Tiefe live**

### Block B (2026-04-27)

- ✅ Prisma: `Analysis` von 1:1 auf 1:n umgestellt, `scenarioName` + 9 Annahme-Felder + 11 berechnete Output-Felder mit Defaults
- ✅ Migration `20260427xxxxxx_analysis_snapshots` auf Railway-DB angewandt
- ✅ Calc-Lib: `computeFullAnalysis(price, rent, assumptions)` mit Kaufnebenkosten, Eigenkapital, Zins, Tilgung, AfA (Gebäudeanteil × Satz), Steuer (Verlustverrechnung möglich), Brutto-/Nettorendite, Cashflow vor/nach Steuer, Score (Netto-Rendite + CF n. Steuer)
- ✅ Backend: POST `/analyze/:id` akzeptiert optionale Annahmen, **erzeugt jeden Aufruf einen neuen Snapshot** statt zu überschreiben; DELETE `/analyses/:id`; GET `/properties` liefert nur jüngsten Snapshot, GET `/properties/:id` alle absteigend
- ✅ Frontend: Analyse-Szenarien-Card mit Vergleichstabelle, „Schnell-Analyse" (Defaults) + „Eigenes Szenario" mit allen 9 Annahmen, Defaults vorbelegt, Datum+Szenario-Name+EK/Zins/Tilg/Total-Investment/Renditen/CF/Score in Tabellenform; Detail-Seite zeigt aktuellen Snapshot oben in 3-Spalten-Layout

### Block A (2026-04-27)

### Block A (2026-04-27)

- ✅ Prisma: Enum `DealStatus` (WATCHING, INQUIRED, NEGOTIATING, LOI, NOTAR, CLOSED, REJECTED) auf Property + neues `Note`-Model
- ✅ Migration `20260426202823_add_status_and_notes` auf Railway-DB angewandt
- ✅ Backend: PATCH/DELETE `/properties/:id`, POST `/properties/:id/notes`, DELETE `/notes/:noteId`, Status-Filter `?status=…`, Sort by `updatedAt`
- ✅ Frontend: Status-Badge (7 Farben), Filter-Tabs mit Counts, Score in Liste, Status-Quick-Edit auf Detail-Seite, Notes-Panel (Add/Delete), Edit-Seite, Delete-Buttons (Dashboard + Detail)
- ✅ Bug-Fix: ESLint `react/no-unescaped-entities` deaktiviert (deutsche Anführungszeichen in JSX)
- ✅ Production-Smoke-Test bestanden: PATCH Status → NEGOTIATING, POST Note, GET mit Filter — alles end-to-end

## Aktuelle Phase: **Stage 0 — Setup & Deploy** *(abgeschlossen)*

Status der einzelnen Schritte:

- [x] Code von Claude Code generiert (Backend + Frontend lauffähig im Prinzip)
- [x] `.gitignore` angelegt
- [x] `deploy/`-Ordner mit BAT-Skripten (`01_setup-local`, `02_github-remote`,
      `03_db-migrate`, `04_dev-start`, `05_git-commit-push`, `99_clean-reinstall`)
- [x] `AGENTS.md` + `project_state.md` an DealFlow AI angepasst
- [x] **Marco:** `01_setup-local.bat` ausgeführt (npm install + git init + erster Commit) — 2026-04-26
- [x] **Marco:** GitHub-Repo `immodealflow` (privat) angelegt: https://github.com/mdiverwaltung2023-sketch/immodealflow.git
- [x] **Marco:** `02_github-remote.bat` ausgeführt — Push nach `origin/main` erfolgreich
- [x] **Marco:** Railway-Projekt + Postgres-Service angelegt — 2026-04-26
- [x] **Marco:** `02b_env-setup.bat` — `backend/.env` + `frontend/.env.local` gesetzt
- [x] **Marco:** `03_db-migrate.bat` ausgeführt → Migration `20260426181605_init` auf Railway-DB angewandt
- [x] **Smoke-Test lokal bestanden** — Property → Analyse → Angebot end-to-end funktioniert; 4 Bugs gefixt (Regex-Escape × 2, Claude-Modell, Error-Handler)
- [x] **Code-Fixes + Migration committet + gepusht** — Commit `fix: regex-escape, claude-model, error-handler + railway.json + initial migration`
- [x] **Backend auf Railway live** — Variables (DATABASE_URL Reference, ANTHROPIC_API_KEY, ANTHROPIC_MODEL=claude-sonnet-4-6, FRONTEND_ORIGIN=*, PORT=4000), Domain generiert, End-to-End-Test in Production bestanden
- [x] **Frontend auf Vercel deployt** — `immodealflow-frontend.vercel.app`, Root=frontend, Next.js 14, NEXT_PUBLIC_API_BASE_URL → Railway-Backend
- [x] **`FRONTEND_ORIGIN` auf Railway** = `https://immodealflow-frontend.vercel.app,http://localhost:3000` (CORS für Production + lokale Dev)
- [x] **End-to-End-Test in Production bestanden** — Dashboard zeigt 2 Properties, CORS-Direktcall vom Frontend ans Backend funktioniert
- [ ] **Marco:** Frontend auf Vercel deployen (Root: `frontend/`)
- [ ] URLs in dieser Datei aktualisieren

## Nach Stage 0: Roadmap Stage 1

Priorisierte Liste, abhängig davon, was Marco zuerst will:

### Block A — "Pipeline-Sicht" (operativer Mehrwert)
- `Property.status` (Enum: `WATCHING | INQUIRED | NEGOTIATING | LOI | NOTAR | CLOSED | REJECTED`)
- `PUT /properties/:id` (Edit) und `DELETE /properties/:id`
- Dashboard-Filter nach Status, Sortierung nach `updatedAt`
- Notizen pro Property (`Note { id, propertyId, createdAt, body }`)

### Block B — "Finanzielle Tiefe" (analytischer Mehrwert)
- Erweiterte Analyse: Kaufnebenkosten (Grunderwerbsteuer regional, Notar,
  Makler ~10–15 %), Eigenkapital, Tilgung, Zins, AfA, NetCashflow nach Steuer
- Mehrere Analyse-Snapshots pro Property (`Analysis[]` statt `1:1`)
- Szenarien-Vergleich (best/middle/worst case)

### Block C — "KI-Magie" (Wow-Effekt)
- **Exposé-Import:** URL von Immoscout/Immowelt → Claude extrahiert Felder
- **Marktvergleich:** Claude schätzt Vergleichsmieten/Kaufpreise für Lage
- **Strukturiertes Tool-Use** statt JSON-Parsing für `/offer`
  (zuverlässiger gegen Halluzinationen)

### Block D — "Polish" (UX)
- Toasts statt `alert()` (z. B. `react-hot-toast`)
- Loading-Skeletons im Dashboard
- Edit-Property-Modal
- Mobile Optimierung (Dashboard derzeit nicht ideal)
- E-Mail-Versand des Angebots direkt aus der App
- PDF-Export von Property-Bericht (Stat-Übersicht + Anschreiben)

### Block E — "Account & Sharing" (wenn Mehrnutzerbetrieb kommt)
- Auth via Clerk (analog zum Leadsystem-Projekt)
- Multi-Tenant: User ↔ Properties

## Bekannte Limitierungen

- Keine Auth → App muss privat bleiben oder nur über Vercel-Preview-Schutz
  abgesichert werden.
- `Analysis` und `Offer` sind 1:1 zur Property — Historie geht beim Re-Analyze
  verloren.
- Score-Heuristik ist sehr grob (Bruttorendite + Cashflow), nicht risikoadjustiert.
- Cashflow-Formel: `Miete – 30 % Instandhaltung – (Preis × 2 % p. a.) / 12` —
  ignoriert Tilgung, Eigenkapitalanteil, Steuerwirkung. Realitätsnah erst mit
  Block B.
- `claude.ts` parst freies JSON aus der Antwort → fragil. Tool-Use wäre
  robuster (siehe Block C).
- `frontend/PropertyActions.tsx` nutzt `alert()` statt Toast.
- Keine Tests (weder Backend noch Frontend).

## Deploy-Historie

| Commit | Datum | Inhalt | Status |
|---|---|---|---|
| _(initial commit folgt nach 01_setup-local.bat)_ | 2026-04-26 | Initial MVP von Claude Code | ⏳ |

---

## Begleitdateien

- `AGENTS.md` — Verhaltensregeln für Software-Agenten an diesem Projekt
- `deploy/README.md` — Schritt-für-Schritt-Anleitung für Setup & Deploy
- `deploy/*.bat` — Skripte zum Doppelklicken
- `README.md` — Kurze Einstiegs-Doku

## Regeln für den Agenten (Kurzfassung)

- **Erst lesen, dann handeln** — `project_state.md` und `AGENTS.md` sind
  Pflichtlektüre vor jeder neuen Aufgabe.
- **Live testen nach Deploy** — Health + Endpoint-Call, nicht "sollte klappen".
- **`.env` niemals committen.**
- **BAT-Dateien** nur in `deploy/`, exakte Sprache zur Kommunikation
  ("Klicke folgende BAT: …").
- **Diese Datei aktualisieren**, wenn etwas Substanzielles passiert ist
  (URL geändert, Endpoint dazu, Bug gefixt, Phase abgeschlossen).
