import {
  ASSET_TYPE_LABELS,
  ENERGY_CLASS_LABELS,
  ENERGY_CARRIER_LABELS,
  BUILDING_CONDITION_LABELS,
  SALE_DOC_LABELS,
  type AssetTypeT,
  type AnonymizationLevelT,
  type BuildingConditionT,
  type EnergyClassT,
  type EnergyCarrierT,
  type SaleDocKindT
} from "@/lib/api";
import { FinanceCalculator } from "./FinanceCalculator";

// =====================================================================
// ExposeBody — gemeinsame, druck-perfekte Exposé-Darstellung.
// Wird von der Eigentümer-Vorschau (/expose/[id]) UND der öffentlichen,
// tokenbasierten Käufer-Ansicht (/objekt/[token]) genutzt, damit beide
// identisch aussehen und die Druckqualität an EINER Stelle gepflegt wird.
// Reine Server-Komponente: Map-Props sind erlaubt (kein Client-Boundary).
// =====================================================================

const INK = "#0e1525";
const ACCENT = "#0f766e";

export type ExposeListingView = {
  title: string;
  propertyType: AssetTypeT;
  description: string;
  anonymizationLevel: AnonymizationLevelT;
  city: string;
  postalCode?: string | null;
  district?: string | null;
  fullAddress?: string | null;
  askingPrice: number;
  totalArea: number;
  totalRent?: number | null;
  yearBuilt?: number | null;
  lastRenovation?: number | null;
  condition?: BuildingConditionT | null;
  livingArea?: number | null;
  commercialArea?: number | null;
  landArea?: number | null;
  floors?: number | null;
  residentialUnits?: number | null;
  commercialUnits?: number | null;
  energyClass?: EnergyClassT | null;
  energyConsumption?: number | null;
  energyCarrier?: EnergyCarrierT | null;
  heatingType?: string | null;
  actualRent?: number | null;
  vacancyRate?: number | null;
  waltMonths?: number | null;
  rentIndexed?: boolean | null;
  rentUpsidePotential?: number | null;
  gegCompliant?: boolean | null;
  commissionFree?: boolean | null;
  features: string[];
  highlights: string[];
  images: { id: string; url: string; alt?: string | null }[];
};

// Schlanker Text-Typ — von ExposeContentT (Eigentümer) und der öffentlichen
// Exposé-Antwort (Käufer) gleichermaßen erfüllt.
export type ExposeCopyView = {
  headline: string;
  thesis: string;
  strengths: string[];
  risks: string[];
  locationText?: string | null;
  callToAction?: string | null;
};

export type ExposeViewData = {
  reference: string;
  isPublic: boolean;
  listing: ExposeListingView;
  expose: ExposeCopyView | null;
  /** Verfügbare Dokumente (mit Öffnen-URL), pro Kategorie. */
  docByKind: Map<SaleDocKindT, { url: string }>;
  /** Welche Kategorien werden gelistet? Eigentümer: volle Reihenfolge; Käufer: freigegebene. */
  docKinds: SaleDocKindT[];
};

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Math.round(n));
}

function area(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n)} m²`;
}

function locationLine(l: ExposeListingView): string {
  if (l.anonymizationLevel === "FULL_ADDRESS") {
    const zipCity = [l.postalCode, l.city].filter(Boolean).join(" ");
    return [l.fullAddress, zipCity].filter(Boolean).join(", ") || l.city;
  }
  if (l.anonymizationLevel === "DISTRICT_ONLY") {
    return [l.district, l.city].filter(Boolean).join(", ") || l.city;
  }
  return l.city;
}

function grossYield(l: ExposeListingView): number | null {
  if (l.totalRent && l.askingPrice > 0) return (l.totalRent * 12) / l.askingPrice * 100;
  return null;
}

function Section({
  eyebrow,
  title,
  children,
  pageBreak
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  pageBreak?: boolean;
}) {
  return (
    <section className={`mt-10 break-inside-avoid${pageBreak ? " break-before-page" : ""}`}>
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-700">{eyebrow}</div>
        <div className="mt-1 flex items-center gap-4">
          <h2 className="font-serif text-2xl font-semibold text-zinc-900">{title}</h2>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 break-inside-avoid">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-zinc-900">{value}</div>
      {sub ? <div className="text-[11px] text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-zinc-100 py-2">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

export function ExposeBody({ data }: { data: ExposeViewData }) {
  const { listing: l, expose, docByKind, docKinds, isPublic, reference } = data;

  const cover = l.images[0] ?? null;
  const gallery = l.images.slice(1, 7);
  const gy = grossYield(l);
  const objectType = ASSET_TYPE_LABELS[l.propertyType];
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  const heroKpis: Array<{ label: string; value: string }> = [];
  if (l.totalArea) heroKpis.push({ label: "Fläche", value: area(l.totalArea) });
  if (l.residentialUnits || l.commercialUnits) {
    const units = (l.residentialUnits ?? 0) + (l.commercialUnits ?? 0);
    heroKpis.push({ label: "Einheiten", value: String(units) });
  }
  if (gy != null) heroKpis.push({ label: "Bruttorendite", value: `${gy.toFixed(1).replace(".", ",")} %` });
  if (l.yearBuilt) heroKpis.push({ label: "Baujahr", value: String(l.yearBuilt) });

  const thesisParas = (expose?.thesis || "")
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const descriptionParas = (l.description || "")
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const availableCount = docByKind.size;

  return (
    <>
      {/* Druck-Regeln: nur #expose drucken, A4-Ränder, Seitenumbrüche, Farbtreue */}
      <style>{`
        #print-footer { display: none; }
        @media print {
          @page { margin: 1.2cm; }
          body * { visibility: hidden !important; }
          #expose, #expose * { visibility: visible !important; }
          #expose {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0; padding: 0; border: none; box-shadow: none; border-radius: 0;
            max-width: none;
          }
          .no-print { display: none !important; }
          .break-before-page { break-before: page; }
          #print-footer {
            display: block; position: fixed; bottom: 4px; left: 0; right: 0;
            text-align: center; font-size: 8px; color: #a1a1aa;
          }
        }
        #expose { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #expose .font-serif { font-family: Georgia, "Times New Roman", serif; }
      `}</style>

      <article
        id="expose"
        className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
      >
        {/* ================= TITELSEITE ================= */}
        <div className="relative flex min-h-[24cm] flex-col justify-between break-after-page p-0">
          <div className="absolute inset-0">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.url} alt={cover.alt ?? l.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/45" />
          </div>

          <div className="relative z-10 flex items-center justify-between p-8 text-white">
            <div className="text-sm font-semibold uppercase tracking-[0.28em]">Infinity Oikos</div>
            <div className="rounded-full border border-white/40 px-3 py-1 text-[11px] font-medium uppercase tracking-widest backdrop-blur-sm">
              {objectType}
            </div>
          </div>

          <div className="relative z-10 p-8 text-white">
            <h1 className="font-serif text-4xl font-semibold leading-tight drop-shadow-sm md:text-5xl">
              {l.title}
            </h1>
            <p className="mt-3 text-lg text-white/85">{locationLine(l)}</p>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-white/70">Kaufpreis</div>
                <div className="font-serif text-4xl font-bold">{eur(l.askingPrice)}</div>
                {l.commissionFree ? (
                  <div className="mt-1 inline-block rounded bg-emerald-500/90 px-2 py-0.5 text-[11px] font-semibold">
                    provisionsfrei
                  </div>
                ) : null}
              </div>

              {heroKpis.length ? (
                <div className="flex gap-3">
                  {heroKpis.map((k) => (
                    <div
                      key={k.label}
                      className="min-w-[92px] rounded-xl border border-white/25 bg-white/10 px-4 py-3 backdrop-blur-sm"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">{k.label}</div>
                      <div className="mt-0.5 text-lg font-bold">{k.value}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-3 text-[11px] text-white/70">
              <span>Exposé · {reference}</span>
              <span>{today}</span>
            </div>
          </div>
        </div>

        {/* ================= INHALT ================= */}
        <div className="p-8">
          <Section eyebrow="Überblick" title="Auf einen Blick">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Objektart" value={objectType} />
              {l.totalArea ? <Kpi label="Gesamtfläche" value={area(l.totalArea)} /> : null}
              {l.livingArea ? <Kpi label="Wohnfläche" value={area(l.livingArea)} /> : null}
              {l.commercialArea ? <Kpi label="Gewerbefläche" value={area(l.commercialArea)} /> : null}
              {l.residentialUnits ? <Kpi label="Wohneinheiten" value={String(l.residentialUnits)} /> : null}
              {l.commercialUnits ? <Kpi label="Gewerbeeinheiten" value={String(l.commercialUnits)} /> : null}
              {l.totalRent ? <Kpi label="Soll-Miete / Monat" value={eur(l.totalRent)} /> : null}
              {gy != null ? <Kpi label="Bruttorendite (ca.)" value={`${gy.toFixed(1).replace(".", ",")} %`} /> : null}
              {l.yearBuilt ? <Kpi label="Baujahr" value={String(l.yearBuilt)} /> : null}
              {l.energyClass ? <Kpi label="Energieklasse" value={ENERGY_CLASS_LABELS[l.energyClass]} /> : null}
            </div>

            {l.highlights.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {l.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800"
                  >
                    {h}
                  </span>
                ))}
              </div>
            ) : null}
          </Section>

          {expose ? (
            <Section eyebrow="Investment-These" title={expose.headline || "Warum dieses Objekt"}>
              <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6">
                <div className="space-y-3 text-[15px] leading-relaxed text-zinc-800">
                  {thesisParas.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>

                {expose.strengths.length ? (
                  <div className="mt-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700">
                      Kaufargumente
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                      {expose.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="mt-0.5 text-teal-600">✓</span>
                          <span className="text-sm text-zinc-700">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {expose.risks.length ? (
                  <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Transparent geprüft
                    </div>
                    <ul className="mt-2 space-y-1">
                      {expose.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                          <span className="mt-0.5 text-amber-500">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-[10px] text-zinc-400">
                KI-gestützte Einschätzung auf Basis der Objektdaten – keine Zusicherung. Stand: {today}.
              </p>
            </Section>
          ) : null}

          {descriptionParas.length ? (
            <Section eyebrow="Das Objekt" title="Objektbeschreibung">
              <div className="space-y-3 text-[15px] leading-relaxed text-zinc-700">
                {descriptionParas.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Section>
          ) : null}

          {l.features.length ? (
            <Section eyebrow="Ausstattung" title="Ausstattung & Merkmale">
              <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                {l.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 border-b border-zinc-100 py-1.5">
                    <span className="mt-0.5 text-teal-600">✓</span>
                    <span className="text-sm text-zinc-700">{f}</span>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {(l.totalRent || l.actualRent || l.vacancyRate != null || l.waltMonths != null || l.rentUpsidePotential) ? (
            <Section eyebrow="Wirtschaftlichkeit" title="Vermietung & Ertrag">
              <div className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
                <div>
                  <DataRow label="Soll-Miete / Monat" value={l.totalRent ? eur(l.totalRent) : "—"} />
                  <DataRow label="Ist-Miete / Monat" value={l.actualRent ? eur(l.actualRent) : "—"} />
                  <DataRow label="Soll-Miete / Jahr" value={l.totalRent ? eur(l.totalRent * 12) : "—"} />
                  <DataRow label="Bruttorendite (ca.)" value={gy != null ? `${gy.toFixed(1).replace(".", ",")} %` : "—"} />
                </div>
                <div>
                  <DataRow label="Leerstand" value={l.vacancyRate != null ? `${l.vacancyRate.toFixed(1).replace(".", ",")} %` : "—"} />
                  <DataRow label="WALT" value={l.waltMonths != null ? `${Math.round(l.waltMonths)} Monate` : "—"} />
                  <DataRow label="Miete indexiert" value={l.rentIndexed == null ? "—" : l.rentIndexed ? "Ja" : "Nein"} />
                  <DataRow label="Mietsteigerungspotenzial / Monat" value={l.rentUpsidePotential ? eur(l.rentUpsidePotential) : "—"} />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-zinc-400">
                Angaben ohne Gewähr. Interaktive Finanzierungsrechnung siehe folgender Abschnitt.
              </p>
            </Section>
          ) : null}

          <Section eyebrow="Finanzierung" title="Finanzierungsrechner" pageBreak>
            <FinanceCalculator price={l.askingPrice} rent={l.totalRent ?? null} />
          </Section>

          <Section eyebrow="Zustand" title="Bausubstanz & Energie">
            <div className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
              <div>
                <DataRow label="Baujahr" value={l.yearBuilt ?? "—"} />
                <DataRow label="Letzte Modernisierung" value={l.lastRenovation ?? "—"} />
                <DataRow label="Zustand" value={l.condition ? BUILDING_CONDITION_LABELS[l.condition] : "—"} />
                <DataRow label="Etagen" value={l.floors ?? "—"} />
                <DataRow label="Grundstücksfläche" value={l.landArea ? area(l.landArea) : "—"} />
              </div>
              <div>
                <DataRow label="Energieklasse" value={l.energyClass ? ENERGY_CLASS_LABELS[l.energyClass] : "—"} />
                <DataRow label="Energieverbrauch" value={l.energyConsumption != null ? `${l.energyConsumption} kWh/(m²·a)` : "—"} />
                <DataRow label="Energieträger" value={l.energyCarrier ? ENERGY_CARRIER_LABELS[l.energyCarrier] : "—"} />
                <DataRow label="Heizungsart" value={l.heatingType ?? "—"} />
                <DataRow label="GEG-konform" value={l.gegCompliant == null ? "—" : l.gegCompliant ? "Ja" : "Nein"} />
              </div>
            </div>
          </Section>

          {gallery.length ? (
            <Section eyebrow="Impressionen" title="Bildergalerie" pageBreak>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.alt ?? l.title}
                    className="aspect-[4/3] w-full break-inside-avoid rounded-lg object-cover"
                  />
                ))}
              </div>
            </Section>
          ) : null}

          <Section eyebrow="Standort" title="Lage & Umfeld">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="text-sm text-zinc-500">Standort</div>
              <div className="mt-1 text-lg font-semibold text-zinc-900">{locationLine(l)}</div>
              <p className="mt-2 text-[13px] text-zinc-600">
                {expose?.locationText
                  ? expose.locationText
                  : "Detaillierte Lagekarte und Umfeldanalyse folgen im interaktiven Exposé."}
              </p>
            </div>
          </Section>

          {/* Datenraum */}
          <Section eyebrow="Datenraum" title="Verfügbare Unterlagen" pageBreak>
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
                {availableCount}
              </div>
              <div className="text-sm text-teal-900">
                {isPublic
                  ? "Diese Unterlagen stehen Ihnen im gesicherten digitalen Datenraum zum Abruf bereit."
                  : availableCount > 0
                    ? "Unterlagen liegen im gesicherten digitalen Datenraum bereit und werden Kaufinteressenten auf Anfrage freigegeben."
                    : "Der gesicherte digitale Datenraum wird für dieses Objekt vorbereitet."}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
              {docKinds.map((kind) => {
                const doc = docByKind.get(kind);
                const has = Boolean(doc);
                return (
                  <div key={kind} className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2">
                    <div className="flex items-center gap-2">
                      <span className={has ? "text-teal-600" : "text-zinc-300"}>{has ? "✓" : "○"}</span>
                      {has ? (
                        <>
                          <a
                            href={doc!.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="no-print text-sm font-medium text-zinc-800 hover:text-teal-700 hover:underline"
                          >
                            {SALE_DOC_LABELS[kind]}
                          </a>
                          <span className="hidden text-sm font-medium text-zinc-800 print:inline">
                            {SALE_DOC_LABELS[kind]}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-zinc-400">{SALE_DOC_LABELS[kind]}</span>
                      )}
                    </div>
                    <span className={`text-[11px] font-medium ${has ? "text-teal-700" : "text-zinc-300"}`}>
                      {has ? (isPublic ? "öffnen" : "vorhanden") : "auf Anfrage"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-zinc-400">
              {isPublic
                ? "Zugriff über Ihren persönlichen, gesicherten Datenraum-Link — vertraulich zu behandeln."
                : "Zugriff auf die vollständigen Dokumente erfolgt über einen persönlichen, gesicherten Datenraum-Link — ohne Registrierung, jederzeit widerrufbar."}
            </p>
          </Section>

          <Section eyebrow="Kontakt" title="Ihr nächster Schritt">
            <div
              className="rounded-2xl p-6 text-white break-inside-avoid"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${INK})` }}
            >
              <div className="text-lg font-semibold">Interesse an diesem Objekt?</div>
              <p className="mt-1 text-sm text-white/80">
                {expose?.callToAction
                  ? expose.callToAction
                  : "Sichern Sie sich weiterführende Unterlagen und ein persönliches Gespräch. Alle Verkaufsunterlagen stellen wir Ihnen über einen sicheren, digitalen Datenraum bereit."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="rounded-lg bg-white/15 px-3 py-1.5 font-medium">Infinity Oikos</span>
                <span className="text-white/80">Referenz: {reference}</span>
              </div>
            </div>
          </Section>

          <p className="mt-8 text-[10px] leading-relaxed text-zinc-400">
            Dieses Exposé dient ausschließlich der unverbindlichen Information und begründet kein Vertragsangebot.
            Alle Angaben beruhen auf Informationen des Eigentümers; für Richtigkeit und Vollständigkeit wird keine
            Gewähr übernommen. Zwischenverkauf vorbehalten.
          </p>
        </div>
      </article>

      <div id="print-footer">Infinity Oikos · Exposé {reference} · {today}</div>
    </>
  );
}
