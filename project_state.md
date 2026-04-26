# PROJECT STATE — DealFlow AI (ImmoDealFlow)

> Stand: **2026-04-26**. Diese Datei ist die Single Source of Truth für den
> aktuellen Projektstand. Bei jeder substanziellen Änderung (neuer Endpoint,
> neuer Deploy, neuer Bug, Status-Update) hier nachziehen.

---

## 🔑 WIE CLAUDE IN DIE APP KOMMT (IMMER ZUERST LESEN)

### URLs

| Service    | URL                                               | Status |
|------------|---------------------------------------------------|--------|
| Frontend   | _(Vercel folgt — Account `mdiverwaltung.2023@gmail.com`)_ | ⏳ pending |
| Backend    | _(noch nicht deployt — Railway folgt)_            | ⏳ pending |
| Health     | `<backend>/health` → `{"ok":true}`                | ⏳ |
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

## Aktuelle Phase: **Stage 0 — Setup & Deploy**

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
- [ ] **Code-Fixes + Migration committen + pushen** ← **AKTUELL**
- [ ] **Marco:** Backend-Service auf Railway konfigurieren (railway.json greift, Variables setzen)
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
