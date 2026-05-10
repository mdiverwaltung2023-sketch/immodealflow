"use client";

import Link from "next/link";
import { useState } from "react";
import {
  analyzeSalesStrategy,
  ASSET_TYPE_OPTIONS,
  CONDITION_OPTIONS,
  EXPERIENCE_OPTIONS,
  LOCATION_OPTIONS,
  OCCUPANCY_OPTIONS,
  REASON_OPTIONS,
  SCENARIO_LABELS,
  SCENARIO_TONES,
  TIME_OPTIONS,
  type AdvisorInput,
  type AdvisorOutput,
  type AssetType,
  type Condition,
  type Experience,
  type LocationQuality,
  type Occupancy,
  type SaleReason,
  type Scenario,
  type TimePressure
} from "../lib/salesAdvisor";

type RefinedAdvice = {
  reportSelbst: string;
  reportHybrid: string;
  reportMakler: string;
  riskFlags: string[];
  specificTips: string[];
  adjustedRecommendation: "SELBST" | "HYBRID" | "MAKLER" | "";
  adjustmentReason: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * Phase L11 — Wizard für den KI-Verkaufsberater. Single-Step,
 * alle Felder auf einmal. Lokal gerechnet, sofortiges Ergebnis.
 *
 * Conversion-Pfad: User füllt Felder -> Klick -> Ergebnis-Karte
 * mit drei Szenarien-Scores + Erklärung + szenario-spezifische
 * CTAs (Sign-up / Pricing / Makler-Vermittlung).
 */
export function AdvisorWizard() {
  const [assetType, setAssetType] = useState<AssetType>("ETW");
  const [city, setCity] = useState("");
  const [locationQuality, setLocationQuality] = useState<LocationQuality>("GUT");
  const [area, setArea] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [condition, setCondition] = useState<Condition>("GEPFLEGT");
  const [occupancy, setOccupancy] = useState<Occupancy>("EIGEN");
  const [saleReason, setSaleReason] = useState<SaleReason>("FREIWILLIG");
  const [timePressure, setTimePressure] = useState<TimePressure>("12M");
  const [experience, setExperience] = useState<Experience>("ETWAS");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [result, setResult] = useState<AdvisorOutput | null>(null);
  const [lastInput, setLastInput] = useState<AdvisorInput | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const a = Number(area.replace(",", "."));
    const y = Number(yearBuilt);
    if (!city.trim()) return setErr("Bitte Stadt angeben.");
    if (!Number.isFinite(a) || a <= 0) return setErr("Bitte gültige Wohnfläche angeben.");
    if (!Number.isFinite(y) || y < 1850 || y > 2030) {
      return setErr("Bitte Baujahr zwischen 1850 und 2030 angeben.");
    }
    const ev = estimatedValue.trim() ? Number(estimatedValue.replace(/[^\d]/g, "")) : undefined;
    const input: AdvisorInput = {
      assetType,
      city: city.trim(),
      locationQuality,
      area: a,
      yearBuilt: y,
      condition,
      occupancy,
      saleReason,
      timePressure,
      experience,
      estimatedValue: ev
    };
    setResult(analyzeSalesStrategy(input));
    setLastInput(input);
    // Sanftes Scrollen zum Ergebnis
    setTimeout(() => {
      const el = document.getElementById("advisor-result");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="rounded-2xl border border-zinc-200 bg-white/95 p-6 shadow-xl backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          KI-Analyse
        </div>
        <div className="mt-1 text-base font-semibold text-zinc-900">
          Verkaufen — selbst, hybrid oder mit Makler?
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          8 Felder. Sofortige Empfehlung mit Begründung. Kostenlos und ohne Anmeldung.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Select label="Objektart" value={assetType} onChange={(v) => setAssetType(v as AssetType)} options={ASSET_TYPE_OPTIONS} />
          <Input label="Stadt" value={city} onChange={setCity} placeholder="z.B. Berlin" />
          <Select label="Lage-Qualität" value={locationQuality} onChange={(v) => setLocationQuality(v as LocationQuality)} options={LOCATION_OPTIONS} />
          <Input label="Wohn-/Grundfläche (m²)" value={area} onChange={setArea} type="number" placeholder="120" />
          <Input label="Baujahr" value={yearBuilt} onChange={setYearBuilt} type="number" placeholder="1995" />
          <Select label="Zustand" value={condition} onChange={(v) => setCondition(v as Condition)} options={CONDITION_OPTIONS} />
          <Select label="Belegung" value={occupancy} onChange={(v) => setOccupancy(v as Occupancy)} options={OCCUPANCY_OPTIONS} />
          <Select label="Verkaufsanlass" value={saleReason} onChange={(v) => setSaleReason(v as SaleReason)} options={REASON_OPTIONS} />
          <Select label="Zeitrahmen" value={timePressure} onChange={(v) => setTimePressure(v as TimePressure)} options={TIME_OPTIONS} />
          <Select label="Eigene Verkaufserfahrung" value={experience} onChange={(v) => setExperience(v as Experience)} options={EXPERIENCE_OPTIONS} />
          <Input label="Geschätzter Wert (€, optional)" value={estimatedValue} onChange={setEstimatedValue} type="number" placeholder="450000" />
        </div>

        {err ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
            {err}
          </div>
        ) : null}

        <button
          type="submit"
          className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Empfehlung anzeigen
        </button>

        <div className="mt-2 text-center text-[10px] text-zinc-500">
          Wir geben keine Empfehlung „pro Makler" — die Logik bewertet ehrlich,
          ob du ihn überhaupt brauchst.
        </div>
      </form>

      {result && lastInput ? <ResultCard result={result} input={lastInput} /> : null}
    </div>
  );
}

function ResultCard({ result, input }: { result: AdvisorOutput; input: AdvisorInput }) {
  const [refined, setRefined] = useState<RefinedAdvice | null>(null);
  const [refining, setRefining] = useState(false);
  const [refineErr, setRefineErr] = useState<string | null>(null);

  async function requestRefine() {
    if (refining) return;
    setRefining(true);
    setRefineErr(null);
    try {
      const res = await fetch(`${API_BASE}/sales-advisor/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: input.city,
          assetType: input.assetType,
          locationQuality: input.locationQuality,
          area: input.area,
          yearBuilt: input.yearBuilt,
          condition: input.condition,
          occupancy: input.occupancy,
          saleReason: input.saleReason,
          timePressure: input.timePressure,
          experience: input.experience,
          estimatedValue: input.estimatedValue,
          heuristicScores: {
            selbst: result.scores.SELBST,
            hybrid: result.scores.HYBRID,
            makler: result.scores.MAKLER
          },
          heuristicRecommendation: result.recommendation
        })
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { message?: string } | null;
        setRefineErr(j?.message ?? `Fehler ${res.status}`);
        return;
      }
      const data = (await res.json()) as RefinedAdvice;
      setRefined(data);
    } catch (e) {
      setRefineErr(e instanceof Error ? e.message : "Netzwerkfehler");
    } finally {
      setRefining(false);
    }
  }

  const tone = SCENARIO_TONES[result.recommendation];
  return (
    <div
      id="advisor-result"
      className={`rounded-2xl border-2 ${tone.border} ${tone.bg} p-6 shadow-lg`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-block h-3 w-3 rounded-full ${tone.dot}`} />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Empfehlung
        </span>
      </div>
      <div className={`mt-1 text-xl font-semibold ${tone.text}`}>
        {SCENARIO_LABELS[result.recommendation]}
      </div>

      {/* Score-Bar für alle drei Szenarien */}
      <div className="mt-5 space-y-3">
        <ScoreBar label="Selbst" score={result.scores.SELBST} active={result.recommendation === "SELBST"} color="emerald" />
        <ScoreBar label="Hybrid" score={result.scores.HYBRID} active={result.recommendation === "HYBRID"} color="amber" />
        <ScoreBar label="Makler" score={result.scores.MAKLER} active={result.recommendation === "MAKLER"} color="rose" />
      </div>

      {/* Begründung */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Spricht dafür
          </div>
          <ul className="mt-2 space-y-1 text-xs text-zinc-700">
            {result.positiveFactors.length === 0 ? (
              <li className="text-zinc-400">Keine starken Pro-Faktoren erkannt.</li>
            ) : (
              result.positiveFactors.map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{f.label}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
            Spricht dagegen
          </div>
          <ul className="mt-2 space-y-1 text-xs text-zinc-700">
            {result.negativeFactors.length === 0 ? (
              <li className="text-zinc-400">Keine kritischen Gegen-Faktoren.</li>
            ) : (
              result.negativeFactors.map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span>{f.label}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Zeitspanne (Selbst)" value={result.estimatedTimeToSale.selbst} />
        <Stat label="Zeitspanne (Hybrid)" value={result.estimatedTimeToSale.hybrid} />
        <Stat label="Zeitspanne (Makler)" value={result.estimatedTimeToSale.makler} />
      </div>

      {result.expectedCommissionSavings ? (
        <div className="mt-5 rounded-xl border border-emerald-300 bg-white p-4">
          <div className="text-xs font-semibold text-zinc-900">
            Mögliche Provisions-Ersparnis (geschätzt)
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">
            ~{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(result.expectedCommissionSavings)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            Basis: 3,57 % Maklerprovision (DE Ø, 2026), je nach Bundesland abweichend.
          </div>
        </div>
      ) : null}

      {/* KI-Bericht-Sektion (Phase L11.2) */}
      <div className="mt-6 rounded-xl border border-indigo-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              KI-Bericht — Detailanalyse
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
              Claude verfeinert die Empfehlung mit konkreten Tipps und Risiken für dein Objekt.
              Limit: 5 Anfragen pro Stunde.
            </div>
          </div>
          {!refined ? (
            <button
              type="button"
              onClick={requestRefine}
              disabled={refining}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {refining ? "Analysiere ..." : "🤖 KI-Bericht anfordern"}
            </button>
          ) : null}
        </div>

        {refineErr ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
            {refineErr}
          </div>
        ) : null}

        {refined ? (
          <div className="mt-4 space-y-4">
            {refined.adjustedRecommendation && refined.adjustedRecommendation !== result.recommendation ? (
              <div className="rounded-lg border-2 border-indigo-300 bg-indigo-50 p-3">
                <div className="text-xs font-semibold text-indigo-900">
                  Claude weicht von der Heuristik ab — empfiehlt: {refined.adjustedRecommendation}
                </div>
                <div className="mt-1 text-[11px] text-indigo-800">{refined.adjustmentReason}</div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <ReportTile title="Selbst" body={refined.reportSelbst} tone="emerald" />
              <ReportTile title="Hybrid" body={refined.reportHybrid} tone="amber" />
              <ReportTile title="Makler" body={refined.reportMakler} tone="rose" />
            </div>

            {refined.riskFlags.length > 0 ? (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                  Risiken / Stolpersteine
                </div>
                <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                  {refined.riskFlags.map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {refined.specificTips.length > 0 ? (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Konkrete nächste Schritte
                </div>
                <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                  {refined.specificTips.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Szenario-CTAs */}
      <div className="mt-6 space-y-3">
        <ScenarioCta
          scenario={
            refined?.adjustedRecommendation === "SELBST" ||
            refined?.adjustedRecommendation === "HYBRID" ||
            refined?.adjustedRecommendation === "MAKLER"
              ? refined.adjustedRecommendation
              : result.recommendation
          }
        />
      </div>

      <div className="mt-4 text-center text-[10px] text-zinc-500">
        Nicht bindende Marktorientierung. Nach dem Sign-up bekommst du die volle KI-Analyse mit Mikromarkt-Daten.
      </div>
    </div>
  );
}

function ReportTile({
  title,
  body,
  tone
}: {
  title: string;
  body: string;
  tone: "emerald" | "amber" | "rose";
}) {
  const dot = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          {title}
        </span>
      </div>
      <p className="mt-2 text-xs text-zinc-700 leading-snug">{body}</p>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  active,
  color
}: {
  label: string;
  score: number;
  active: boolean;
  color: "emerald" | "amber" | "rose";
}) {
  const fill = color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className={`${active ? "font-semibold text-zinc-900" : "text-zinc-600"}`}>
          {label}
          {active ? " · empfohlen" : ""}
        </span>
        <span className={`tabular-nums ${active ? "font-semibold text-zinc-900" : "text-zinc-500"}`}>
          {score}/100
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full ${fill} ${active ? "" : "opacity-60"}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ScenarioCta({ scenario }: { scenario: Scenario }) {
  if (scenario === "SELBST") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-white p-4">
        <div className="text-sm font-semibold text-emerald-900">
          Du bist gut aufgestellt für die Eigenvermarktung.
        </div>
        <div className="mt-1 text-xs text-zinc-600">
          Im Investor Club bekommst du KI-Preisstrategie, Exposé-Generator,
          Käufer-Bonitäts-Check und Verhandlungsunterstützung.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/sign-up"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Kostenlos starten
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Verkaufs-Tools im Investor Club
          </Link>
        </div>
      </div>
    );
  }
  if (scenario === "HYBRID") {
    return (
      <div className="rounded-xl border border-amber-200 bg-white p-4">
        <div className="text-sm font-semibold text-amber-900">
          Du verkaufst selbst — wir liefern dir die Bausteine, die du brauchst.
        </div>
        <div className="mt-1 text-xs text-zinc-600">
          Profi-Fotos, Käufer-Bonitäts-Check, Notar-Vorbereitung, Preisstrategie —
          punktgenau, ohne Provisionsfalle. Alles als Einzel-Buchung.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/sign-up"
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Hybrid-Pakete ansehen
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50"
          >
            Investor Club starten
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-rose-200 bg-white p-4">
      <div className="text-sm font-semibold text-rose-900">
        Hier macht ein erfahrener Makler den Unterschied.
      </div>
      <div className="mt-1 text-xs text-zinc-600">
        Komplexe Vermarktung, schwierige Lage oder Zeitdruck — wir vermitteln
        dich an verifizierte Makler aus unserem Netzwerk. Provision wird vor dem
        Auftrag transparent verhandelt.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/sign-up?advisor=makler"
          className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
        >
          Makler-Empfehlung anfordern
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          Erst Profil anlegen
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-zinc-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-zinc-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
