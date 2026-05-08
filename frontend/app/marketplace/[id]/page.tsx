import Link from "next/link";
import {
  ASSET_TYPE_LABELS,
  ANONYMIZATION_LABELS,
  BUILDING_CONDITION_LABELS,
  ENERGY_CARRIER_LABELS,
  MarketplaceListingDetailSchema,
  type MarketplaceListingDetailT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { StarSummary } from "@/components/StarRating";
import { ImageGallery } from "@/components/ImageGallery";
import { EnergyPill } from "@/components/ListingCard";
import { InquiryActions } from "./InquiryActions";
import { ProfileMatchCard } from "./ProfileMatchCard";

/* ---------- Helpers ---------- */

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function num(n: number, digits = 0) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(n);
}

function pct(ratio: number, digits = 1) {
  return `${num(ratio * 100, digits)} %`;
}

// Grobe Stadt → Bundesland → Grunderwerbsteuer-Mapping (Stand 2026)
const GREST_BY_STATE: Record<string, number> = {
  BY: 3.5, BW: 5.0, BE: 6.0, BB: 6.5, HB: 5.0, HH: 5.5, HE: 6.0,
  MV: 6.0, NI: 5.0, NW: 6.5, RP: 5.0, SL: 6.5, SN: 5.5, ST: 5.0,
  SH: 6.5, TH: 6.5
};
const CITY_TO_STATE: Record<string, string> = {
  berlin: "BE", münchen: "BY", muenchen: "BY", hamburg: "HH", bremen: "HB",
  köln: "NW", koeln: "NW", düsseldorf: "NW", duesseldorf: "NW",
  münster: "NW", muenster: "NW", bochum: "NW", essen: "NW", dortmund: "NW",
  frankfurt: "HE", wiesbaden: "HE", stuttgart: "BW", "stuttgart-mitte": "BW",
  dresden: "SN", leipzig: "SN", hannover: "NI", augsburg: "BY",
  erfurt: "TH", "magdeburg": "ST", potsdam: "BB", rostock: "MV",
  saarbrücken: "SL", saarbruecken: "SL", kiel: "SH", mainz: "RP"
};
function grEStRate(city: string): number {
  const code = CITY_TO_STATE[city.trim().toLowerCase()];
  if (code && GREST_BY_STATE[code]) return GREST_BY_STATE[code];
  return 5.5; // Default ca. Mittelwert
}

function calcInvestmentBreakdown(l: MarketplaceListingDetailT) {
  const grestPct = grEStRate(l.city);
  const grest = Math.round(l.askingPrice * (grestPct / 100));
  const notarPct = 1.5; // Notar + Grundbuch ~ 1.5%
  const notar = Math.round(l.askingPrice * (notarPct / 100));
  const commissionPct =
    l.commissionFree ? 0 : (l.commissionRate ?? 3.57);
  const commission = Math.round(l.askingPrice * (commissionPct / 100));
  const total = l.askingPrice + grest + notar + commission;

  // Standard-Annahmen für Monatsrate: 20% EK, 3.8% Zins, 2% Tilgung
  const equityRatio = 0.20;
  const equity = Math.round(total * equityRatio);
  const loan = total - equity;
  const monthlyRate = (loan * (0.038 + 0.02)) / 12;

  return { grestPct, grest, notarPct, notar, commissionPct, commission, total, equity, loan, monthlyRate };
}

/* ---------- Page ---------- */

export default async function MarketplaceDetailPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const l = await apiGet(`/marketplace/${params.id}`, MarketplaceListingDetailSchema);

  const yieldGross = l.totalRent ? ((l.totalRent * 12) / l.askingPrice) * 100 : null;
  const yieldNet = l.actualRent ? ((l.actualRent * 12) / l.askingPrice) * 100 : null;
  const pricePerSqm = l.totalArea > 0 ? l.askingPrice / l.totalArea : null;
  const monthlyRentPerSqm = l.totalRent && l.totalArea > 0 ? l.totalRent / l.totalArea : null;
  const rentMultiplier = l.totalRent ? l.askingPrice / (l.totalRent * 12) : null;
  const locationParts = [l.city, l.district, l.postalCode].filter(Boolean);

  const inv = calcInvestmentBreakdown(l);
  const totalUnits = (l.residentialUnits ?? 0) + (l.commercialUnits ?? 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link href="/marketplace" className="hover:text-indigo-700">Marketplace</Link>
        <span>›</span>
        <span className="text-zinc-700">{ASSET_TYPE_LABELS[l.propertyType]}</span>
        <span>›</span>
        <span className="text-zinc-700">{l.city}</span>
        <span>›</span>
        <span className="text-zinc-900 font-medium truncate max-w-xs">{l.title}</span>
      </nav>

      {/* Galerie */}
      <ImageGallery images={l.images} title={l.title} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
              {ASSET_TYPE_LABELS[l.propertyType]}
            </span>
            {l.anonymizationLevel === "CITY_ONLY" ? (
              <span className="rounded-md bg-zinc-900 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                Off-Market
              </span>
            ) : null}
            <span className="text-xs text-zinc-500">
              Inseriert am {new Date(l.createdAt).toLocaleDateString("de-DE")}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 lg:text-3xl">
            {l.title}
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{locationParts.join(", ")}</span>
          </div>

          {/* Highlights als Pill-Reihe */}
          {l.highlights && l.highlights.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {l.highlights.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                >
                  <span aria-hidden>✓</span>
                  {h}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end">
          <div className="text-3xl font-bold tracking-tight text-zinc-900">
            {eur(l.askingPrice)}
          </div>
          {pricePerSqm != null ? (
            <div className="text-xs text-zinc-500">
              {eur(Math.round(pricePerSqm))} pro m²
            </div>
          ) : null}
          {l.commissionFree ? (
            <div className="mt-1 text-[11px] font-medium text-emerald-700">Provisionsfrei</div>
          ) : l.commissionRate ? (
            <div className="mt-1 text-[11px] text-zinc-500">
              + {num(l.commissionRate, 2)} % Käuferprovision
            </div>
          ) : null}
        </div>
      </div>

      {/* Hauptlayout */}
      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          {/* Eckdaten-Strip */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-4">
            <KeyStat
              label="Fläche"
              value={`${num(l.totalArea, 0)} m²`}
              icon={<IcArea />}
            />
            <KeyStat
              label="Sollmiete / Mon."
              value={l.totalRent ? eur(l.totalRent) : "—"}
              icon={<IcRent />}
            />
            <KeyStat
              label="Bruttorendite"
              value={yieldGross != null ? `${num(yieldGross, 2)} %` : "—"}
              accent={yieldGross != null && yieldGross >= 5 ? "emerald" : "default"}
              icon={<IcChart />}
            />
            <KeyStat
              label={totalUnits > 0 ? "Einheiten" : "Preis pro m²"}
              value={
                totalUnits > 0
                  ? `${l.residentialUnits ?? 0} WE / ${l.commercialUnits ?? 0} GE`
                  : pricePerSqm != null
                  ? `${num(monthlyRentPerSqm ?? 0, 2)} €/m²`
                  : "—"
              }
              icon={<IcGrid />}
            />
          </div>

          {/* USP: Vermietungs-Cockpit (nur wenn relevante Daten vorhanden) */}
          {l.actualRent != null ||
          l.vacancyRate != null ||
          l.waltMonths != null ||
          l.rentUpsidePotential != null ||
          l.rentIndexed != null ||
          l.tenantCount != null ? (
            <Section
              title="Vermietungs-Cockpit"
              hint="Was reine Privatkäufer-Portale nicht zeigen — die echte Cashflow-Story."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {/* Soll vs. Ist */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Soll vs. Ist
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-zinc-500">Sollmiete</div>
                      <div className="text-lg font-semibold text-zinc-900">
                        {l.totalRent ? eur(l.totalRent) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-zinc-500">Istmiete</div>
                      <div className="text-lg font-semibold text-zinc-900">
                        {l.actualRent ? eur(l.actualRent) : "—"}
                      </div>
                    </div>
                    {l.totalRent && l.actualRent ? (
                      <div className="text-right">
                        <div className="text-[11px] text-zinc-500">Lücke</div>
                        <div
                          className={`text-lg font-semibold ${
                            l.actualRent < l.totalRent ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {l.actualRent < l.totalRent ? "−" : ""}
                          {eur(Math.abs(l.totalRent - l.actualRent))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {l.vacancyRate != null ? (
                    <div className="mt-3 text-xs text-zinc-600">
                      Leerstand: <span className="font-semibold">{pct(l.vacancyRate)}</span>
                    </div>
                  ) : null}
                </div>

                {/* WALT + Indexmiete */}
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Mietverträge
                  </div>
                  <div className="mt-3 grid gap-2">
                    {l.waltMonths != null ? (
                      <Row
                        label="WALT (Restmietdauer)"
                        value={`${num(l.waltMonths / 12, 1)} Jahre`}
                      />
                    ) : null}
                    {l.tenantCount != null ? (
                      <Row label="Anzahl Mietverträge" value={String(l.tenantCount)} />
                    ) : null}
                    {l.rentIndexed != null ? (
                      <Row
                        label="Indexmiete"
                        value={l.rentIndexed ? "Ja" : "Nein"}
                        good={l.rentIndexed === true}
                      />
                    ) : null}
                    {l.rentEscalation != null ? (
                      <Row
                        label="Staffelmiete"
                        value={l.rentEscalation ? "Ja" : "Nein"}
                      />
                    ) : null}
                  </div>
                </div>

                {/* Mietsteigerungspotenzial */}
                {l.rentUpsidePotential != null && l.rentUpsidePotential > 0 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <IcChart />
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                          Mietsteigerungspotenzial
                        </div>
                        <div className="mt-1 text-lg font-semibold text-emerald-900">
                          + {eur(l.rentUpsidePotential)} / Monat erreichbar
                        </div>
                        <div className="text-xs text-emerald-800/80">
                          Geschätzt gegen Mietspiegel — bei Mieterwechsel oder Neuverhandlung. Hebt die effektive Rendite mittelfristig.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {/* Investitions-Rechner */}
          <Section
            title="Investitions-Rechner"
            hint="Gesamtinvest inkl. Grunderwerbsteuer, Notar und Provision. Standard-Annahmen: 20 % EK, 3,8 % Zins + 2 % Tilgung."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Kosten-Aufstellung
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <KostenRow label="Kaufpreis" value={eur(l.askingPrice)} bold />
                  <KostenRow
                    label={`Grunderwerbsteuer (${num(inv.grestPct, 1)} %)`}
                    value={`+ ${eur(inv.grest)}`}
                  />
                  <KostenRow
                    label={`Notar + Grundbuch (${num(inv.notarPct, 1)} %)`}
                    value={`+ ${eur(inv.notar)}`}
                  />
                  <KostenRow
                    label={
                      l.commissionFree
                        ? "Maklerprovision (provisionsfrei)"
                        : `Maklerprovision (${num(inv.commissionPct, 2)} %)`
                    }
                    value={l.commissionFree ? "0 €" : `+ ${eur(inv.commission)}`}
                  />
                  <div className="border-t border-zinc-300 pt-2">
                    <KostenRow label="Gesamtinvest" value={eur(inv.total)} bold />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                  Finanzierungs-Schnellblick
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <Row label="Eigenkapital (20 %)" value={eur(inv.equity)} />
                  <Row label="Darlehen" value={eur(inv.loan)} />
                  <div className="my-2 border-t border-indigo-200" />
                  <div>
                    <div className="text-[11px] text-indigo-700">Monatsrate (Zins + Tilgung)</div>
                    <div className="mt-0.5 text-2xl font-bold text-indigo-900">
                      {eur(Math.round(inv.monthlyRate))}
                    </div>
                    <div className="text-[11px] text-indigo-700/80">
                      = {eur(Math.round(inv.monthlyRate * 12))} / Jahr
                    </div>
                  </div>
                  {l.totalRent ? (
                    <div className="mt-3 rounded-md bg-white/60 p-2 text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Sollmiete - Rate</span>
                        <span className={`font-semibold ${(l.totalRent - inv.monthlyRate) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {(l.totalRent - inv.monthlyRate) >= 0 ? "+ " : "− "}
                          {eur(Math.abs(Math.round(l.totalRent - inv.monthlyRate)))}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        Bruttocashflow vor Bewirtschaftung & Steuer
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {rentMultiplier != null ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Detail label="Mietmultiplikator" value={`${num(rentMultiplier, 1)}-fach`} />
                {yieldGross != null ? (
                  <Detail label="Bruttorendite (Sollmiete)" value={`${num(yieldGross, 2)} %`} />
                ) : null}
                {yieldNet != null ? (
                  <Detail label="Rendite (Istmiete)" value={`${num(yieldNet, 2)} %`} />
                ) : null}
              </div>
            ) : null}
          </Section>

          {/* Bausubstanz & Modernisierung */}
          {l.yearBuilt ||
          l.lastRenovation ||
          l.condition ||
          l.modernizationBacklog != null ||
          l.gegCompliant != null ||
          l.floors ||
          l.livingArea ||
          l.commercialArea ||
          l.landArea ? (
            <Section title="Bausubstanz & Modernisierung">
              <div className="grid gap-3 sm:grid-cols-2">
                {l.yearBuilt ? <Detail label="Baujahr" value={String(l.yearBuilt)} /> : null}
                {l.lastRenovation ? (
                  <Detail label="Letzte Sanierung" value={String(l.lastRenovation)} />
                ) : null}
                {l.condition ? (
                  <Detail label="Zustand" value={BUILDING_CONDITION_LABELS[l.condition]} />
                ) : null}
                {l.floors ? <Detail label="Etagen" value={String(l.floors)} /> : null}
                {l.livingArea ? (
                  <Detail label="Wohnfläche" value={`${num(l.livingArea)} m²`} />
                ) : null}
                {l.commercialArea ? (
                  <Detail label="Gewerbefläche" value={`${num(l.commercialArea)} m²`} />
                ) : null}
                {l.landArea ? (
                  <Detail label="Grundstück" value={`${num(l.landArea)} m²`} />
                ) : null}
              </div>

              {l.modernizationBacklog != null || l.gegCompliant != null ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {l.modernizationBacklog != null ? (
                    <div
                      className={`rounded-xl border p-3 ${
                        l.modernizationBacklog === 0
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-zinc-600">
                        Modernisierungsstau
                      </div>
                      <div
                        className={`mt-1 text-base font-semibold ${
                          l.modernizationBacklog === 0 ? "text-emerald-800" : "text-amber-900"
                        }`}
                      >
                        {l.modernizationBacklog === 0 ? "Kein Stau" : eur(l.modernizationBacklog)}
                      </div>
                    </div>
                  ) : null}
                  {l.gegCompliant != null ? (
                    <div
                      className={`rounded-xl border p-3 ${
                        l.gegCompliant
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-rose-200 bg-rose-50"
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-zinc-600">
                        GEG-Konformität
                      </div>
                      <div
                        className={`mt-1 text-base font-semibold ${
                          l.gegCompliant ? "text-emerald-800" : "text-rose-800"
                        }`}
                      >
                        {l.gegCompliant
                          ? "Erfüllt — keine Pflicht-Sanierung"
                          : "Sanierungspflicht (Heizung/Dämmung)"}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Section>
          ) : null}

          {/* Energieausweis */}
          {l.energyClass || l.energyConsumption || l.energyCarrier || l.heatingType ? (
            <Section title="Energieausweis">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Energieklasse
                  </div>
                  {l.energyClass ? (
                    <EnergyPill cls={l.energyClass} size="md" />
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </div>
                {l.energyConsumption != null ? (
                  <Detail
                    label="Endenergie"
                    value={`${num(l.energyConsumption, 0)} kWh/m²a`}
                  />
                ) : null}
                {l.energyCarrier ? (
                  <Detail label="Energieträger" value={ENERGY_CARRIER_LABELS[l.energyCarrier]} />
                ) : null}
                {l.heatingType ? (
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 sm:col-span-3">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Heizungstechnik
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-zinc-900">{l.heatingType}</div>
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {/* Tenant-Mix (Gewerbe/Mischnutzung) */}
          {l.anchorTenant || (l.tenantSectors && l.tenantSectors.length > 0) ? (
            <Section title="Mieter-Mix">
              <div className="grid gap-3 md:grid-cols-2">
                {l.anchorTenant ? (
                  <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-indigo-700">
                      Anchor-Tenant
                    </div>
                    <div className="mt-1 text-base font-semibold text-indigo-900">
                      {l.anchorTenant}
                    </div>
                  </div>
                ) : null}
                {l.tenantSectors && l.tenantSectors.length > 0 ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Branchen
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {l.tenantSectors.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-zinc-300 bg-white px-2.5 py-0.5 text-xs text-zinc-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {/* Features */}
          {l.features && l.features.length > 0 ? (
            <Section title="Ausstattung">
              <div className="flex flex-wrap gap-1.5">
                {l.features.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700"
                  >
                    <span aria-hidden className="text-emerald-600">•</span>
                    {f}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Beschreibung */}
          {l.description.trim() ? (
            <Section title="Beschreibung">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {l.description.replace(/^\[DEMO-INSERAT\]\s*/, "")}
              </div>
            </Section>
          ) : null}

          {/* Lage */}
          <Section title="Lage">
            <div className="grid gap-3 sm:grid-cols-3">
              <Detail label="Stadt" value={l.city} />
              {l.district ? <Detail label="Stadtteil" value={l.district} /> : null}
              {l.postalCode ? <Detail label="PLZ" value={l.postalCode} /> : null}
              {l.fullAddress ? (
                <div className="sm:col-span-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Vollständige Adresse
                  </div>
                  <div className="mt-1 text-sm font-semibold text-emerald-900">{l.fullAddress}</div>
                </div>
              ) : (
                <div className="sm:col-span-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                  Vollständige Adresse erst nach Anfrage-Annahme. Aktuelle Anonymisierung:{" "}
                  <span className="font-semibold text-zinc-900">
                    {ANONYMIZATION_LABELS[l.anonymizationLevel]}
                  </span>
                  .
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Sticky Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
          {/* Verkäufer-Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Anbieter
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                {(l.owner.name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-900">
                  {l.owner.name ?? "Anonym"}
                </div>
                <div className="text-xs text-zinc-500">
                  {l.owner.role === "INVESTOR"
                    ? "Investor"
                    : l.owner.role === "SELLER"
                    ? "Verkäufer"
                    : "Investor + Verkäufer"}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StarSummary summary={l.sellerRating ?? null} size="md" />
            </div>
          </div>

          {/* Profil-Match-Card */}
          <ProfileMatchCard listing={l} />

          {/* Anfrage-CTA */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Anfrage stellen</div>
            <div className="mt-1 flex items-start gap-2 rounded-lg bg-indigo-50 p-2 text-xs text-indigo-800">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>
                <strong>USP:</strong> Bei Anfrage sieht der Anbieter dein Investor-Profil — Bonität, Trackrecord, Finanzierungsstatus. Nur qualifizierte Anfragen kommen durch.
              </span>
            </div>
            <div className="mt-3">
              <InquiryActions
                listingId={l.id}
                isOwner={l.isOwner}
                listingStatus={l.status}
                myInquiry={l.myInquiry ?? null}
              />
            </div>
          </div>

          {/* Kennzahlen-Schnellblick */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Auf einen Blick
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-zinc-500">Kaufpreis</span>
                <span className="font-semibold text-zinc-900">{eur(l.askingPrice)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-500">Gesamtinvest</span>
                <span className="font-semibold text-zinc-900">{eur(inv.total)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-zinc-500">Monatsrate</span>
                <span className="font-semibold text-zinc-900">
                  {eur(Math.round(inv.monthlyRate))}
                </span>
              </li>
              {yieldGross != null ? (
                <li className="flex justify-between">
                  <span className="text-zinc-500">Bruttorendite</span>
                  <span className={`font-semibold ${yieldGross >= 5 ? "text-emerald-700" : "text-zinc-900"}`}>
                    {num(yieldGross, 2)} %
                  </span>
                </li>
              ) : null}
              {totalUnits > 0 ? (
                <li className="flex justify-between">
                  <span className="text-zinc-500">Einheiten</span>
                  <span className="font-semibold text-zinc-900">
                    {l.residentialUnits ?? 0} WE / {l.commercialUnits ?? 0} GE
                  </span>
                </li>
              ) : null}
              {l.energyClass ? (
                <li className="flex items-center justify-between">
                  <span className="text-zinc-500">Energie</span>
                  <EnergyPill cls={l.energyClass} />
                </li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Building blocks ---------- */

function Section({
  title,
  hint,
  children
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function KeyStat({
  label,
  value,
  icon,
  accent = "default"
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "default" | "emerald";
}) {
  const valueCls = accent === "emerald" ? "text-emerald-700" : "text-zinc-900";
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
        <div className={`text-sm font-semibold ${valueCls}`}>{value}</div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function Row({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-600">{label}</span>
      <span className={`font-semibold ${good ? "text-emerald-700" : "text-zinc-900"}`}>{value}</span>
    </div>
  );
}

function KostenRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold text-zinc-900" : "text-zinc-600"}>{label}</span>
      <span className={bold ? "font-semibold text-zinc-900" : "text-zinc-700"}>{value}</span>
    </div>
  );
}

/* Icons */
function IcArea() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" />
    </svg>
  );
}
function IcRent() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}
function IcChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IcGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
