# Phase Q — Co-Investment Hub (Konzept)

> Stand: 2026-06-21. Aus dem strategischen Konzept
> `Oikros_Co-Investment-Hub_Konzept.docx` abgeleiteter Bau-Plan.
> Phase Q baut additiv auf Bestehendem auf (InvestorProfile, Rating,
> TrackrecordItem, Offmarket-Chat-Muster, UserPlan, Notifications).

## Ziel

Investoren miteinander vernetzen und Co-Investments ermöglichen — **reine
Kontakt-/Anbahnungsplattform (Matching), KEIN Crowdfunding**. Oikos sammelt
kein Kapital ein, vermittelt keine Anlage und wickelt keine Transaktion ab.
Die Transaktion findet außerhalb der Plattform in Eigenverantwortung der
Parteien statt. Erlöse rein abo-basiert (deal-unabhängig), nie Erfolgsprovision.

## Was schon existiert (wiederverwenden, nicht duplizieren)

| Baustein | Bestehendes Modell | Rolle im Hub |
|----------|--------------------|--------------|
| Kapitalgeber-Profil | `InvestorProfile` (equity, preferredAssetTypes, preferredRegions, min/maxTicketSize, experience, visibility) | Kapital-Seite des Matchings — KEIN neues Modell nötig |
| Track Record | `TrackrecordItem` | Erfahrungsnachweis / Trust |
| Bewertungen | `Rating` (beidseitig, Gegendarstellung) | Trust-Signal |
| 1:1-Chat + Invite | `OffmarketLead/Invite/Message` | Vorlage für Deal-Room (Q2) |
| Abo/Billing | `UserPlan` + Stripe | Monetarisierungs-Gating |
| Notifications | `UserNotification` | Interesse/Match-Benachrichtigung |

Net-neu in Phase Q ist das **Co-Investment-Gesuch** (`CoInvestRequest`) plus
das **Matching** zwischen Gesuch und InvestorProfile.

## Phasen-Übersicht

### Q1 — Fundament (DIESER PUSH)
- Datenmodell `CoInvestRequest` (+ Enums `InvestStrategy`, `CoInvestStatus`) + Migration.
- Matching-Engine `lib/coinvest.ts`: 6-Faktor-Score mit Breakdown.
- Backend-Endpunkte: CRUD eigener Gesuche, Marktplatz (ACTIVE, anonymisiert),
  Matches je Gesuch (Kapitalgeber-Sicht für den Gesuchsteller),
  personalisierter Feed (Gesuche für mein Kapitalprofil).
- Frontend-Datenlayer (`lib/api.ts`) + minimale Seite `/co-investments`.
- `project_state.md`-Eintrag.

### Q2 — Interesse + Deal-Room
- `CoInvestInterest` (Interessenbekundung Kapitalgeber → Gesuch, accept/reject)
  analog `OffmarketInvite`.
- Deal-Room mit 1:1-Chat + Dokumenten (mirror `OffmarketMessage` +
  `BuyerDocAccess`-Muster). Geschützte Felder/Dokumente erst nach beidseitigem OK.
- Notifications bei Interesse / Annahme.

### Q3 — Investor Trust Score
- Aggregat-Score (0–100) + Stufen (Bronze/Silber/Gold/Platin) + Badges,
  zusammengesetzt aus Verifizierung (Identität/Bonität/EK), abgeschlossenen
  Deals, Antwortgeschwindigkeit, Bewertungen.
- Verifizierungs-Workflows (Identität, EK-Nachweis) schrittweise.

### Q4 — Deal-Partner-Netzwerk
- `DealPartnerProfile` (JV-Partner, Projektentwickler, Sanierung, Verwalter,
  Deal Sourcer) + Discovery/Filter. Kein Kapital, sondern Know-how/Leistung.

## Datenmodell Q1 (Prisma)

```prisma
enum InvestStrategy {
  BUY_AND_HOLD
  FIX_AND_FLIP
  PROJECT_DEVELOPMENT
  VALUE_ADD
  CASHFLOW
  OTHER
}

enum CoInvestStatus {
  DRAFT      // angelegt, noch nicht veröffentlicht
  ACTIVE     // im Marktplatz sichtbar
  MATCHED    // in Gesprächen / Deal-Room aktiv
  CLOSED     // Partner gefunden / abgeschlossen
  ARCHIVED   // zurückgezogen
}

model CoInvestRequest {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ownerId String
  owner   User   @relation("CoInvestRequests", fields: [ownerId], references: [id], onDelete: Cascade)

  title             String
  assetType         AssetType?
  location          String          @default("")   // Region/Stadt, z.B. "Berlin" / "NRW"
  purchasePrice     Int?            // EUR Kaufpreis
  equityAvailable   Int?            // EUR vorhandenes Eigenkapital
  capitalNeed       Int?            // EUR gesuchter Kapitalbedarf
  strategy          InvestStrategy?
  holdingPeriodYears Int?
  targetReturnPct   Float?          // Renditeerwartung in %
  description       String          @default("")

  status     CoInvestStatus    @default(DRAFT)
  visibility ProfileVisibility @default(ON_REQUEST)

  @@index([ownerId, status])
  @@index([status, assetType])
}
```

## Matching-Engine — Faktoren & Gewichte

| Faktor | Gewicht | Logik |
|--------|---------|-------|
| Region | 20 % | Gesuch-`location` vs. `InvestorProfile.preferredRegions` (Voll/Teil/Kein) |
| Objektart | 20 % | Gesuch-`assetType` in `preferredAssetTypes` |
| Volumen | 20 % | `capitalNeed` im Ticket-Korridor `min/maxTicketSize` |
| Strategie | 15 % | Strategie-Übereinstimmung (Q1: heuristisch, da Profil keine Strategie hält) |
| Rendite | 15 % | `targetReturnPct` vs. Profil-Renditeziel (Q1: Heuristik/neutral) |
| Erfahrung/Trust | 10 % | `investmentExperienceYears` + (Q3) Trust Score |

`MatchScore = round(100 × Σ gewicht·teilscore)`. Breakdown wird immer
mitgeliefert (keine Black-Box).

## Endpunkte Q1 (Backend)

Alle unter `requireAuth`. Eigene Gesuche unter `/me` (bereits geschützt),
Marktplatz/Feed unter neuem `app.use("/coinvest", requireAuth)`.

| Methode | Pfad | Zweck |
|---------|------|-------|
| GET | `/me/coinvest-requests` | Eigene Gesuche (alle Status) |
| POST | `/me/coinvest-requests` | Neues Gesuch (DRAFT) |
| GET | `/me/coinvest-requests/:id` | Eigenes Gesuch-Detail |
| PATCH | `/me/coinvest-requests/:id` | Felder + Status (z.B. ACTIVE) |
| DELETE | `/me/coinvest-requests/:id` | Löschen |
| GET | `/me/coinvest-requests/:id/matches` | Passende Kapitalgeber (Score) zum eigenen Gesuch |
| GET | `/coinvest/marketplace` | ACTIVE Gesuche, anonymisiert, filterbar |
| GET | `/coinvest/marketplace/:id` | Gesuch-Detail (Sichtbarkeit beachtet) |
| GET | `/coinvest/feed` | Personalisiert: ACTIVE Gesuche, gescored gegen mein InvestorProfile |

## Rechtliche Leitplanke (gilt für alle Q-Phasen)

- Oikos stellt nur Kontakt her — keine Anlagevermittlung/-beratung, keine
  Geldannahme, keine Erfolgsprovision.
- Marktplatz-/Feed-Antworten geben keine personenbezogenen Kontaktdaten frei,
  bevor beidseitiges Interesse besteht (Q2: Deal-Room-Gate).
- Disclaimer-Texte in UI + AGB (eigenverantwortliche Prüfung, keine Empfehlung).
- Vor Launch: verbindliche aufsichtsrechtliche Prüfung (BaFin) — siehe Konzept-Doc Abschnitt 11.
