# PROJECT STATE — DealFlow AI (ImmoDealFlow)

> Stand: **2026-05-07** (Phase C). Diese Datei ist die Single Source of Truth
> für den aktuellen Projektstand. Bei jeder substanziellen Änderung (neuer
> Endpoint, neuer Deploy, neuer Bug, Status-Update) hier nachziehen.

---

## 🔑 WIE CLAUDE IN DIE APP KOMMT (IMMER ZUERST LESEN)

### URLs

| Service     | URL                                                                                | Status  |
|-------------|------------------------------------------------------------------------------------|---------|
| Frontend    | https://immodealflow-frontend.vercel.app                                           | ✅ live |
| Backend     | https://dealflow-ai-backend-production.up.railway.app                              | ✅ live |
| Health      | https://dealflow-ai-backend-production.up.railway.app/health → `{"ok":true}`        | ✅      |
| GitHub-Repo | https://github.com/mdiverwaltung2023-sketch/immodealflow                           | ✅      |
| Auth        | Clerk (`pk_test_bGFzdGluZy1mbGFtaW5nby0xNS5jbGVyay5hY2NvdW50cy5kZXYk`)              | ✅ live |

### Lokaler Zugang

```
Backend:  http://localhost:4000  (Health: /health)
Frontend: http://localhost:3000
```

Start: `deploy\04_dev-start.bat` doppelklicken.

### Auth-Flow

Alle API-Routen außer `/health`, `/bookmarklet/*` und Public Pages (`/`, `/sign-in`,
`/sign-up`, `/bookmarklet`) sind durch Clerk geschützt:

1. Frontend holt JWT via `auth.getToken()` (Server) oder `useAuth().getToken()` (Client).
2. Token geht als `Authorization: Bearer …` an Backend.
3. Backend (`backend/src/lib/auth.ts`) verifiziert Token mit `@clerk/backend`,
   provisioniert User Just-in-Time (`User.clerkId` unique) und setzt `req.userId`.
4. Alle Routes filtern auf `where: { ownerId: req.userId }` — Multi-Tenant ab Tag 1.

### Test-Reihenfolge nach Deploy

1. **Health-Check:** `GET <backend>/health` → erwartet `{"ok":true}`.
2. **Auth-Probe:** Frontend `/dashboard` aufrufen — wenn nicht eingeloggt,
   Redirect auf Sign-in. Nach Login: Dashboard rendert eigene Properties.
3. **/me-Probe:** im Browser-Console `await fetch("/me", { headers })` →
   liefert `{ id, clerkId, email, name, role, legacyCount }`.
4. **Property-Detail:** Auction-Card (für ZVG), Analyse-Snapshot, Marktvergleich,
   Notes — alles mit Owner-Filter.
5. **Bookmarklet-Flow** (siehe `/bookmarklet`).

---

## Projekt

**DealFlow AI** — Tool zur Analyse von Immobilien-Deals (Investor-Perspektive)
mit langfristigem Ziel: **Two-Sided Marketplace MFH/Gewerbe**, in dem Verkäufer
das Investor-Profil (Trackrecord, Finanzierung) sehen können. Marco hat
Maklererlaubnis nach § 34c GewO. Aktueller Funktionsumfang abgeschlossen:

- Property-Pipeline (7 Status), Notes, Edit/Delete
- Mehrere Analyse-Snapshots pro Objekt mit Annahmen-Variation
- Claude-Tool-Use für Angebots-Generierung, Exposé-Import, Marktvergleich
- ZVG/DGA-Versteigerungen (Bietlimit-Berechnung, PDF/Text/URL-Import,
  Listen-Import, Universal-Bookmarklet)
- Auth + Multi-Tenant (Clerk + User-Modell + `ownerId`-Filter)

## Architektur

- **Frontend:** Next.js 14 (App Router) + React 18 + Tailwind 3 + Zod (`frontend/`)
- **Auth:** Clerk (`@clerk/nextjs` + `@clerk/backend`), `clerkMiddleware` schützt
  alle nicht-Public-Routen, JWT-Forwarding via `lib/api-server.ts` (Server-Components)
  und `lib/client-fetch.ts` (Client-Components)
- **Backend:** Node.js + Express 5 + Prisma 6 + Zod, TypeScript ESM (`backend/`)
- **DB:** PostgreSQL (Railway)
- **KI:** Anthropic API (`@anthropic-ai/sdk` 0.70), Modell `claude-sonnet-4-6`,
  Tool-Use überall (`callWithTool`)
- **Hosting:** Backend → Railway, Frontend → Vercel
- **Monorepo:** npm workspaces

## Datenmodell (Prisma)

Quelle: `backend/prisma/schema.prisma`. Aktuelle Migrationen siehe
`backend/prisma/migrations/`.

```
User { id, clerkId(unique), email, name?, role(UserRole),
       onboardingCompletedAt? }
   ├── Property[]         (1:n via ownerId, onDelete SetNull)
   ├── InvestorProfile?   (1:1, Bonität + Präferenzen + Sichtbarkeit)
   └── TrackrecordItem[]  (1:n, abgeschlossene Deals)

Property { id, title, price, rent, location, size, status(DealStatus),
           dealType(DealType), ownerId? }
   ├── Analysis[]         (1:n, Snapshots mit 9 Annahmen + 11 Outputs)
   ├── Offer?             (1:1, Claude-Vorschlag + Anschreiben)
   ├── Note[]             (1:n)
   ├── MarketComparison?  (1:1, Claude-Marktdaten + Rating)
   └── AuctionInfo?       (1:1, ZVG/DGA-Daten + Bietlimit)

InvestorProfile { userId(unique), bio, investmentExperienceYears,
                  equity?, monthlyIncome?, monthlyDebt?,
                  financingPreApproved, financingNote?,
                  preferredAssetTypes[], preferredRegions[],
                  minTicketSize?, maxTicketSize?,
                  visibility(ProfileVisibility) }

TrackrecordItem { userId, type(AssetType), year, value?, location,
                  role(TrackrecordRole), description?, verifiedBy? }

Listing { ownerId, title, description, propertyType(AssetType),
          status(ListingStatus), askingPrice, totalArea, totalRent?,
          city, postalCode?, district?, fullAddress?,
          anonymizationLevel(AnonymizationLevel) }
   └── ListingImage[]   (1:n, url, alt?, sortOrder)
```

Enums: `UserRole {INVESTOR, SELLER, BOTH}`, `DealStatus {WATCHING, INQUIRED,
NEGOTIATING, LOI, NOTAR, CLOSED, REJECTED}`, `DealType {FREE_SALE, AUCTION}`,
`AuctionType {ZVG, DGA, SDL, KARHAUSEN, OTHER}`, `MarketRating {below_market,
fair, above_market}`, `AssetType {MFH, COMMERCIAL, MIXED_USE, SINGLE_FAMILY,
APARTMENT, LAND, OTHER}`, `ProfileVisibility {PRIVATE, ON_REQUEST, PUBLIC}`,
`TrackrecordRole {BUYER, SELLER, PARTNER, BROKER, OTHER}`,
`ListingStatus {DRAFT, ACTIVE, IN_NEGOTIATION, SOLD, ARCHIVED}`,
`AnonymizationLevel {FULL_ADDRESS, DISTRICT_ONLY, CITY_ONLY}`.

## Backend-Endpunkte

Public (kein Auth):

| Methode | Pfad                  | Zweck                                          |
|---------|-----------------------|------------------------------------------------|
| GET     | `/health`             | Healthcheck                                    |

Auth-geschützt (`requireAuth`):

| Methode | Pfad                              | Zweck                                                  |
|---------|-----------------------------------|--------------------------------------------------------|
| GET     | `/me`                             | Aktueller User + `onboardingCompletedAt` + `legacyCount` |
| PATCH   | `/me`                             | Felder updaten (Name, Rolle)                           |
| POST    | `/me/complete-onboarding`         | Onboarding-Timestamp setzen (optional Rolle/Name mit)  |
| POST    | `/me/claim-legacy`                | Übernimmt alle ownerId=null Properties auf den User    |
| GET     | `/me/profile`                     | Investor-Profil (legt leeres bei Bedarf an, mit Bonität-Calc + Trackrecord) |
| PATCH   | `/me/profile`                     | Profil-Felder upserten (alle optional)                 |
| POST    | `/me/trackrecord`                 | Trackrecord-Eintrag anlegen                            |
| DELETE  | `/me/trackrecord/:id`             | Eigenen Trackrecord-Eintrag löschen                    |
| GET     | `/me/listings`                    | Eigene Listings (alle Status, optional `?status=` Filter) |
| POST    | `/me/listings`                    | Neues Listing (DRAFT)                                  |
| GET     | `/me/listings/:id`                | Eigenes Listing-Detail (alle Felder)                   |
| PATCH   | `/me/listings/:id`                | Listing-Felder updaten (inkl. Status, Anonymisierung)  |
| DELETE  | `/me/listings/:id`                | Listing samt Bildern löschen                           |
| POST    | `/me/listings/:id/images`         | Bild-URL anhängen (Frontend hat schon hochgeladen)     |
| DELETE  | `/me/listings/:listingId/images/:imageId` | Bild entfernen                                 |
| GET     | `/marketplace`                    | Aktive Listings, anonymisiert; Filter `?city=&type=&priceMin=&priceMax=&areaMin=` |
| GET     | `/marketplace/:id`                | Listing-Detail, anonymisiert                           |
| GET     | `/properties`                     | Liste eigener Properties (mit `?status=` Filter)       |
| POST    | `/properties`                     | Property anlegen (Zod-validiert), `ownerId=req.userId` |
| GET     | `/properties/:id`                 | Detail (eigene), inkl. Auction/Analyse/Markt/Offer/Notes |
| PATCH   | `/properties/:id`                 | Felder updaten                                         |
| DELETE  | `/properties/:id`                 | Property löschen                                       |
| POST    | `/properties/:id/notes`           | Notiz anlegen                                          |
| DELETE  | `/notes/:noteId`                  | Notiz löschen                                          |
| POST    | `/analyze/:id`                    | Neuer Analyse-Snapshot (optionale Annahmen)            |
| DELETE  | `/analyses/:id`                   | Analyse-Snapshot löschen                               |
| POST    | `/offer/:id`                      | Claude-Tool-Use `propose_offer` → `Offer` upsert       |
| POST    | `/properties/:id/market-comparison` | Claude-Tool-Use `market_comparison` → upsert         |
| POST    | `/properties/:id/recompute-bid-limit` | Bietlimit per Bisektion neu berechnen              |
| POST    | `/import/expose`                  | Claude-Tool-Use `extract_property` (Text → Felder)     |
| POST    | `/import/auction`                 | ZVG-Import (Body `{text}`/`{pdfBase64}`/`{url}`)       |
| POST    | `/import/auction-list`            | Listen-Import (Body `{url}` oder `{text}`)             |

Quelle: `backend/src/index.ts`, `backend/src/lib/auth.ts`.

## Frontend-Routen

Public (Clerk-Middleware lässt durch):

| Pfad                  | Zweck                                                  |
|-----------------------|--------------------------------------------------------|
| `/`                   | Landing für nicht-eingeloggte User                     |
| `/sign-in`, `/sign-up`| Clerk-Auth-Pages                                       |
| `/bookmarklet`        | Anleitung + Drag-to-Bookmarks                          |
| `/bookmarklet/receive`| POST-Empfänger (server-to-server an Backend)           |

Geschützt (Login erforderlich, `requireOnboardedUser()`-Guard):

| Pfad                       | Zweck                                                  |
|----------------------------|--------------------------------------------------------|
| `/onboarding`              | Rollen-Auswahl beim ersten Login (INVESTOR/SELLER/BOTH); kein Guard, sonst Loop |
| `/dashboard`               | Eigene Properties, Status-Filter, Score, Claim-Banner  |
| `/new`                     | Neue Property + Schnell-Import-Card                    |
| `/property/[id]`           | Detail (Auction/Analyse/Markt/Offer/Notes)             |
| `/property/[id]/edit`      | Edit-Form                                              |
| `/profile`                 | Investor-Profil + Trackrecord                          |
| `/listings`                | Eigene Listings (Verkäufer-Sicht, Status-Übersicht)    |
| `/listings/new`            | Neues Listing als Entwurf                              |
| `/listings/[id]/edit`      | Listing bearbeiten + Bilder hochladen + Anonymisierung + Status |
| `/marketplace`             | Öffentliche Suchseite mit Filtern, anonymisierte Karten |
| `/marketplace/[id]`        | Listing-Detail (anonymisierte Lage je nach Stufe)      |
| `/auctions`                | Versteigerungs-Liste sortiert nach Termin              |
| `/auctions/import`         | 4 Tabs (Text/PDF/URL/Liste)                            |
| `/api/upload-image` (POST) | Frontend-Route Handler — lädt File zu Vercel Blob hoch (Auth via Clerk, ENV `BLOB_READ_WRITE_TOKEN`); 503 wenn Blob nicht aktiviert |

Guard-Mechanik: `requireOnboardedUser()` in `lib/api-server.ts` ruft `/me` ab,
redirected auf `/onboarding`, wenn `onboardingCompletedAt == null`. Eingebaut
in: `dashboard/page.tsx`, `new/page.tsx` (via Wrapper), `property/[id]/page.tsx`,
`property/[id]/edit/page.tsx`, `profile/page.tsx`, `auctions/layout.tsx` (deckt
beide Auctions-Pages ab). NICHT in `/onboarding` selbst (Loop).

Server-Components nutzen `lib/api-server.ts` mit `import "server-only"` und
top-level `import { auth } from "@clerk/nextjs/server"`. Client-Components
nutzen `lib/client-fetch.ts` mit `useApiFetch()` Hook.

## Aktuelle Phase: **Phase C erledigt — Verkäufer-Listings + Marketplace live**

### Phase C (2026-05-07) — Verkäufer-Listings + Marketplace + Bilder

- ✅ Prisma: `Listing` (1:n User via ownerId, Cascade-Delete), `ListingImage`
  (1:n Listing); Enums `ListingStatus`, `AnonymizationLevel`. Migration
  `20260507_add_listing` auf Railway.
- ✅ Backend Verkäufer-Endpoints: `GET/POST /me/listings`, `GET/PATCH/DELETE
  /me/listings/:id`, `POST /me/listings/:id/images`, `DELETE
  /me/listings/:listingId/images/:imageId`. Owner-Filter überall.
- ✅ Backend Marketplace: `GET /marketplace` (mit Filter city/type/priceMin/
  priceMax/areaMin, max 100 Items), `GET /marketplace/:id`. Beide nur für
  eingeloggte User, beide laufen `anonymizeListing()` durch — leakt nur die
  Felder, die laut `anonymizationLevel` erlaubt sind. Rohdaten bleiben in DB.
- ✅ Vercel Blob Setup: `@vercel/blob` als Frontend-Dependency, Frontend-Route
  `app/api/upload-image/route.ts` (POST, multipart/form-data, max 4 MB,
  nur images/*, Pathname `listings/<userId>/<timestamp>-<filename>`,
  graceful 503 wenn `BLOB_READ_WRITE_TOKEN` nicht gesetzt).
  **Marco-Schritt:** Vercel Dashboard → Project → Storage → Blob → Create
  Store. Token wird automatisch in Project-Envs gesetzt.
- ✅ Frontend Verkäufer-Seite:
  - `/listings` — Liste mit Status-Badge, Bildanzahl, Status-Übersichts-Karten
  - `/listings/new` — Eckdaten-Form, legt DRAFT an, leitet auf Edit weiter
  - `/listings/[id]/edit` — Vollständige Edit-Form mit Anonymisierungs-Auswahl
    (3 Karten), Status-Dropdown, Bilder-Upload-Section (Drag-and-Drop einfaches
    File-Input, Thumbnail-Grid, Delete pro Bild), Löschen-Button
- ✅ Frontend Marketplace:
  - `/marketplace` — Filter-Card (Stadt, Typ, Preisrange, Min-Fläche),
    Karten-Grid mit Cover-Bild, Verkäufer-Namen
  - `/marketplace/[id]` — Bilder-Galerie, Eckdaten + Lage + Verkäufer-Info,
    respektiert Anonymisierungsstufe (zeigt Hinweis "Vollständige Adresse
    erst nach Anfrage-Annahme — Phase D")
- ✅ Nav-Links "Marketplace" und "Meine Listings" im Layout.

### Phase B (2026-05-07) — Investor-Profil + Trackrecord

- ✅ Prisma: Models `InvestorProfile` (1:1 User), `TrackrecordItem` (1:n User);
  Enums `AssetType`, `ProfileVisibility`, `TrackrecordRole`. Migration
  `20260507_add_investor_profile` auf Railway.
- ✅ Backend: `GET/PATCH /me/profile` (legt bei Bedarf leer an, upsert mit
  Bonität-Calc), `POST /me/trackrecord`, `DELETE /me/trackrecord/:id`.
- ✅ Bonität-Calc (`computeAffordability`): 40 % Netto-Einkommen − Verbindlichkeiten
  als max Kapitaldienst, daraus per Annuität (3,8 % Zins + 2,0 % Tilgung) das
  max Darlehen, plus EK = max Investitionssumme. Selbstauskunft, keine Bankprüfung.
- ✅ Frontend `/profile` mit 4 Sections + Trackrecord:
  - **Identität:** Bio + Erfahrungsjahre
  - **Bonität:** EK / Einkommen / Schulden / Vorab-Genehmigung / Note, mit
    Live-Calc max Darlehen + max Investment beim Tippen
  - **Präferenzen:** Asset-Klassen-Chips, Regionen-Tags, Min/Max Ticket-Size
  - **Sichtbarkeit:** 3 Karten (Privat / Nur bei Anfrage / Öffentlich)
  - **Trackrecord:** Liste + Add-Form (Asset-Typ / Jahr / Rolle / Lage / Volumen /
    Beschreibung) + Delete
- ✅ Nav-Link "Profil" im Layout zwischen "Neues Objekt" und "Bookmarklet".
- ✅ Production-Smoke-Test 2026-05-07: leeres Profil GET liefert defaults,
  alle Sections rendern, PATCH speichert (siehe Live-Test).

### Push A3 (2026-05-06) — Onboarding + Rollen-Auswahl

- ✅ Schema: `User.onboardingCompletedAt: DateTime?`. Migration
  `20260506_add_user_onboarding`.
- ✅ Backend: `PATCH /me` (Rolle/Name updaten), `POST /me/complete-onboarding`
  (setzt Timestamp + optional Rolle/Name). `GET /me` liefert `onboardingCompletedAt`.
- ✅ Frontend `/onboarding` mit 3-Karten-UI (Investor/Verkäufer/Beides) +
  Anzeigename. Server-Component prüft auf `onboardingCompletedAt` und
  redirected auf `/dashboard`, wenn schon abgeschlossen.
- ✅ Redirect-Guard `requireOnboardedUser()` in `lib/api-server.ts`, eingebaut
  in allen geschützten Pages (siehe Frontend-Routen-Tabelle).
- ✅ Footer-Fix: "End-to-End MVP (ohne Auth)" → "Investor- und Verkäufer-Tool
  für MFH/Gewerbe" (war seit Push A2 falsch).
- ✅ Production-Smoke-Test 2026-05-06: Marco wurde von /dashboard auf /onboarding
  geleitet, wählt "Beides", POST /me/complete-onboarding gibt 200, redirect
  auf /dashboard funktioniert. `/me` liefert `role: "BOTH"`,
  `onboardingCompletedAt: "2026-05-06T20:53:25.394Z"`.

### Push A2 (2026-05-06) — User-Modell + Owner-Filter

- ✅ Prisma: Enum `UserRole`, neues Model `User { clerkId(unique), email, name, role }`,
  `Property.ownerId` nullable + `onDelete: SetNull`. Migration
  `20260506175214_add_users_and_owner` auf Railway.
- ✅ Backend `requireAuth` (`backend/src/lib/auth.ts`): verifiziert Clerk-JWT,
  provisioniert User Just-in-Time, hängt `req.userId` an. `app.use("/properties",
  requireAuth)` etc. — alle API-Routen geschützt außer `/health`.
- ✅ Owner-Filter überall: `findUnique` durch `findFirst({ where: { id, ownerId } })`,
  CREATEs setzen `ownerId: req.userId`.
- ✅ `GET /me` + `POST /me/claim-legacy` für Migration bestehender Pre-Auth-Daten.
- ✅ Frontend: `lib/api-server.ts` (NEU, server-only) + `lib/client-fetch.ts`
  (NEU, `useApiFetch` Hook). Alle Server-Components und Client-Components
  umgezogen. `lib/api.ts` hat jetzt nur noch Zod-Schemas.
- ✅ `middleware.ts` schützt `/dashboard`, `/property/*`, `/auctions/*`, `/new`
  via `auth.protect()`.
- ✅ Landing-Page `/` für nicht-eingeloggte User.
- ✅ `ClaimLegacyBanner` auf Dashboard, wenn `legacyCount > 0`.
- ✅ Bookmarklet-Receiver `/bookmarklet/receive/route.ts` mit Auth-Check und
  Token-Forwarding ans Backend.
- ✅ Production-Smoke-Test 2026-05-06: 3 Pre-Auth-Properties via Claim-Legacy
  auf Marcos Account übernommen, `/me` liefert `legacyCount=0`, alle Detail-Cards
  rendern, Notes-CRUD funktioniert.

### Push A1 (Davor) — Clerk-Integration

- ✅ Clerk-App angelegt, Keys in Vercel + Railway eingetragen
- ✅ `@clerk/nextjs` integriert, `<ClerkProvider>` in Root-Layout
- ✅ Sign-up/Sign-in funktioniert end-to-end

### Roadmap nach Phase C

**Phase D** — **Inquiry-Flow** (USP wird sichtbar): `Inquiry`-Modell
(listingId, investorId, status, message), Verkäufer bekommt Investor-Profil-
Auszug bei Anfrage (respektiert dann auch `InvestorProfile.visibility`),
akzeptiert/lehnt ab, danach Kontakt-Channel + Freigabe der `fullAddress`.
Status-Pipeline am Listing: aktiv → mehrere Inquiries → in Verhandlung mit X
→ verkauft.

**Phase E** — Bewertungssystem (nur nach Listing-Status SOLD, DSGVO/UWG-konform).

**Phase F** *(optional)* — In-App Messaging zwischen Käufer + Verkäufer.

### Phase 3 (2026-04-29) — Universal-Bookmarklet

- ✅ Backend CORS auf `/import/*` für beliebige Origins offen (`bookmarkletCors`)
- ✅ POST `/bookmarklet/receive` (Frontend Route Handler) als CSP-sicherer
  Server-Side-Proxy: Bookmarklet macht Form-POST (umgeht Immoscout `connect-src`),
  Frontend ruft Backend mit Token auf
- ✅ `/bookmarklet`-Page mit Drag-to-Bookmarks-Anleitung (Auction-/Expose-Modus)
- ✅ Live-Test auf Immoscout24 (Expose) und ZVG-Portal (Auction) bestanden

### Phase 2 (2026-04-28) — Listen-Import

- ✅ Claude `extract_auction_list` (max 50 Items)
- ✅ `POST /import/auction-list` (URL → Server-Side-fetch → bulk insert,
  AuctionType aus Domain), neuer Tab in `/auctions/import`
- ⚠️ Bekannte Limitierung: SPAs (DGA) brauchen Bookmarklet (Phase 3)

### Phase 1 (2026-04-28) — ZVG-Importer + Bietlimit

- ✅ `DealType` + `AuctionType` Enums, `Property.dealType`, `AuctionInfo` 1:1
- ✅ Calc-Lib: `computeBidLimit(rent, assumptions)` per Bisektion (max Preis
  bei CF n. Steuer ≥ 0)
- ✅ Claude Tool-Use `extract_auction` für ZVG-Bekanntmachungen
- ✅ PDF-Parser `pdf-parse` mit eigener Type-Shim
- ✅ `POST /import/auction` (Text/PDF/URL), `POST /properties/:id/recompute-bid-limit`
- ✅ `/auctions`-Page (sortiert anstehend → ohne Termin → vergangen),
  `/auctions/import`, Auction-Card auf Property-Detail mit Termin-Banner
- ⚠️ Bekannt: `auctionDate` als UTC, im Browser +2 h CEST. Fix später.

### Block C (2026-04-27) — KI-Magie

- ✅ `claude.ts` refactored: `callWithTool` mit `tool_choice`, drei Use-Cases
  (`propose_offer`, `extract_property`, `market_comparison`)
- ✅ `MarketComparison` Model + Migration
- ✅ POST `/import/expose`, POST `/properties/:id/market-comparison`
- ✅ Schnell-Import-Card auf `/new`, Marktvergleich-Card auf Property-Detail

### Block B (2026-04-27) — Finanzielle Tiefe

- ✅ `Analysis` 1:1 → 1:n, 9 Annahmen + 11 Outputs mit Defaults
- ✅ `computeFullAnalysis` (Kaufnebenkosten, EK, Zins, Tilgung, AfA, Steuer,
  Renditen, Cashflow vor/nach Steuer, Score)
- ✅ Snapshots statt Upsert, DELETE `/analyses/:id`
- ✅ Analyse-Szenarien-Card mit Vergleichstabelle, Schnell-Analyse + Eigenes Szenario

### Block A (2026-04-26) — Pipeline-Sicht

- ✅ `DealStatus` Enum, `Note` Model
- ✅ PATCH/DELETE `/properties/:id`, Notes-CRUD, Status-Filter
- ✅ Status-Badge, Filter-Tabs, Score in Liste, Notes-Panel, Edit-Seite

### Stage 0 (2026-04-26) — Setup & Deploy

- ✅ Code generiert, GitHub-Repo, Railway+Postgres, Vercel-Deploy
- ✅ End-to-End Production-Test bestanden

## Bekannte Limitierungen / Tech-Debt

- `Offer` ist 1:1 zur Property — Historie geht beim Re-Generate verloren
- Score-Heuristik ist grob (Netto-Rendite + CF n. Steuer), nicht risikoadjustiert
- `auctionDate` als UTC (Anzeige +2 h CEST verschoben)
- `frontend/PropertyActions.tsx` nutzt `alert()` statt Toast
- Bonität-Calc ist Faustformel (40 % Einkommen-Cap, 5,8 % Annuität) — Selbstauskunft,
  keine Bankprüfung; für Phase D evtl. Verifikations-Stufe ergänzen
- `requireOnboardedUser()` macht in jeder geschützten Server-Page einen extra
  `/me`-Call — pragmatisch, könnte später per Layout/Cache optimiert werden
- Profil-Sichtbarkeit ist nur gespeichert, noch nicht durchgesetzt — Enforcement
  kommt erst in Phase D mit dem Inquiry-Flow
- Bilder-Upload nutzt Server-Side-Upload (4 MB Limit pro Datei wegen Vercel
  Serverless Body-Limit). Für größere Dateien später Client-Upload-Pattern
  mit `handleUpload` von `@vercel/blob/client` umstellen.
- Marketplace-Karten zeigen aktuell `owner.name` ohne Sichtbarkeits-Check —
  fixen wir mit Phase D (Profil-Visibility wird dann durchgesetzt).
- Keine Tests (weder Backend noch Frontend)
- Bookmarklet-Receiver leitet nur Token weiter, keine Rate-Limiting

## Deploy-Historie (auszugsweise, neueste zuerst)

| Datum       | Inhalt                                                       |
|-------------|--------------------------------------------------------------|
| 2026-05-07  | Phase C: Verkäufer-Listings + Marketplace + Bilder-Upload    |
| 2026-05-07  | Phase B: Investor-Profil + Trackrecord + Bonität-Calc        |
| 2026-05-06  | Push A3: Onboarding + Rolle wählen + Footer-Fix              |
| 2026-05-06  | Push A2: User-Modell + ownerId + Auth-Middleware + Legacy-Claim |
| 2026-05-05  | Push A1: Clerk-Integration                                   |
| 2026-04-29  | Phase 3: Bookmarklet                                         |
| 2026-04-28  | Phase 1+2: ZVG-Import, Listen-Import                         |
| 2026-04-27  | Block B+C: Analyse-Snapshots, KI-Magie                       |
| 2026-04-26  | Block A + Stage 0: Pipeline + Initial Deploy                 |

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
- **Owner-Filter NIE vergessen** — neue Routes brauchen `where: { ownerId: req.userId }`,
  CREATEs setzen `ownerId: req.userId`. Sonst Datenleck.
- **Diese Datei aktualisieren**, wenn etwas Substanzielles passiert ist
  (URL geändert, Endpoint dazu, Bug gefixt, Phase abgeschlossen).
