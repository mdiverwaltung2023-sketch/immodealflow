# Deploy-Skripte für DealFlow AI

Diese BAT-Dateien führen die wichtigsten Setup- und Deploy-Schritte aus.
**Doppelklick zum Ausführen** — jedes Skript pausiert am Ende, du siehst den Output.

> Vor dem ersten Mal: kurz **`../project_state.md`** querlesen — dort steht,
> in welcher Phase wir gerade sind und welche Schritte schon erledigt waren.
> Verhaltensregeln für KI-Agenten am Projekt: **`../AGENTS.md`**.

## Reihenfolge (einmalig beim Aufsetzen)

| # | Skript | Zweck |
|---|---|---|
| 01 | `01_setup-local.bat` | npm install + git init + erster Commit |
| — | (manuell) GitHub-Repo auf https://github.com/new anlegen | |
| 02 | `02_github-remote.bat` | Repo verbinden + erster Push |
| — | (manuell) Railway-Projekt + Postgres anlegen, `backend/.env` füllen | |
| 03 | `03_db-migrate.bat` | Prisma-Migration anwenden |
| 04 | `04_dev-start.bat` | Lokal Backend + Frontend starten |
| — | (manuell) Vercel-Projekt anlegen, ENV setzen | |

## Reihenfolge (im Daily Use)

| Skript | Zweck |
|---|---|
| `04_dev-start.bat` | Entwicklung lokal |
| `05_git-commit-push.bat` | Änderungen committen + pushen → Vercel + Railway deployen automatisch |
| `99_clean-reinstall.bat` | Notfall: alle node_modules wegwerfen und neu installieren |

---

## Manuelle Schritte (Web-UI / .env)

### A — GitHub-Repo anlegen (einmalig, vor Skript 02)

1. https://github.com/new aufrufen (Login-Account: Marco)
2. Repository-Name: `immodealflow`
3. **Privat** lassen
4. **NICHT** "Initialize with README" anhaken
5. "Create repository"
6. Auf der nächsten Seite die HTTPS-URL kopieren (z. B. `https://github.com/<user>/immodealflow.git`) — die fragt `02_github-remote.bat` ab.

### B — Railway-Projekt anlegen (einmalig, vor Skript 03)

Account: **mdiverwaltung.2023@gmail.com**

1. https://railway.app → Login → "New Project"
2. **"Deploy from GitHub repo"** wählen → das gerade gepushte Repo auswählen
3. Railway erkennt automatisch das Monorepo. Bei Bedarf **Root Directory = `backend`** setzen (Settings → Service → Source).
4. Im selben Projekt: **"+ New" → "Database" → "Add PostgreSQL"**
5. Im Backend-Service unter **Variables** folgende ENV setzen (Railway bietet einen "Reference"-Knopf für die DB-URL):
   - `DATABASE_URL` = `${{ Postgres.DATABASE_URL }}` (Reference)
   - `ANTHROPIC_API_KEY` = dein Anthropic-Key
   - `FRONTEND_ORIGIN` = später die Vercel-URL (z. B. `https://immodealflow.vercel.app`); für jetzt erstmal `*` oder leer lassen
   - `PORT` = `4000` (Railway setzt das oft auch automatisch über `$PORT`)
6. Build-Command: `npm install && npm run build -w backend && npx prisma generate --schema=backend/prisma/schema.prisma`
7. Start-Command: `npm run start -w backend`
8. Im Backend-Service auf **Settings → Networking → "Generate Domain"** klicken → öffentliche URL bekommen (für Vercel und für `.env`).

### C — Lokale `backend/.env` anlegen (vor Skript 03)

Datei: `backend\.env` (kopiere `.env.example` als Vorlage)

```
DATABASE_URL="<aus Railway kopieren — Public DATABASE_URL>"
PORT=4000
FRONTEND_ORIGIN="http://localhost:3000"
ANTHROPIC_API_KEY="<dein Key>"
```

> Die **Public** DATABASE_URL aus Railway nehmen, nicht die interne — sonst kommst du lokal nicht an die DB.

### D — Lokale `frontend/.env.local` anlegen (vor Skript 04)

Datei: `frontend\.env.local`

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Für Production (Vercel) wird das später auf die Railway-Backend-URL gesetzt.

### E — Vercel-Projekt anlegen (einmalig, nach erfolgreichem Smoke-Test)

Account: **mdiverwaltung.2023@gmail.com**

1. https://vercel.com → "Add New" → "Project" → Repo importieren
2. **Root Directory = `frontend`** (wichtig im Monorepo!)
3. Framework: Next.js (wird automatisch erkannt)
4. **Environment Variables**: `NEXT_PUBLIC_API_BASE_URL` = Railway-Backend-URL (aus Schritt B/8)
5. "Deploy" — fertig. Vercel-URL kopieren.
6. Zurück nach Railway → Backend-Service → Variables → `FRONTEND_ORIGIN` auf die Vercel-URL setzen → Backend redeployt automatisch.

---

## Sicherheit

- **`.env`-Dateien werden NICHT committet** (steht in `.gitignore`).
- API-Keys nur über Railway/Vercel-Variables, nicht im Code.
- `ANTHROPIC_API_KEY`: für lokal kannst du den gleichen Key wie in deiner anderen App nehmen, für Production empfohlen einen separaten Key (bessere Übersicht in der Anthropic-Console).
