"use client";

import Link from "next/link";
import { useState } from "react";
import {
  computeQuickEstimate,
  type AssetType,
  type QuickEstimateOutput
} from "../lib/quickEstimate";

const ASSET_LABELS: Record<AssetType, string> = {
  MFH: "Mehrfamilienhaus",
  ETW: "Eigentumswohnung",
  GEWERBE: "Gewerbe"
};

/**
 * Phase L10 — interaktiver Bietlimit-Rechner direkt im Hero.
 * Komplett lokal: keine Auth, kein Backend-Call, kein Token-Verbrauch.
 * Nach Klick erscheint die Schätzung unmittelbar — der Conversion-Hook.
 */
export function HeroCalculator() {
  const [city, setCity] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("MFH");
  const [area, setArea] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [result, setResult] = useState<QuickEstimateOutput | null>(null);
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
    setResult(computeQuickEstimate({ city: city.trim(), assetType, area: a, yearBuilt: y }));
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/95 p-6 shadow-xl backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
        Schnell-Schätzung
      </div>
      <div className="mt-1 text-base font-semibold text-zinc-900">
        Was zahlt der Markt?
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Datenbasierte Marktorientierung — kostenlos, in 30 Sekunden, ohne Anmeldung.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">Stadt</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="z.B. Berlin"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">Asset-Typ</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as AssetType)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {(Object.keys(ASSET_LABELS) as AssetType[]).map((k) => (
                <option key={k} value={k}>
                  {ASSET_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">
              Wohnfläche (m²)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="80"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-600">Baujahr</label>
            <input
              type="number"
              min={1850}
              max={2030}
              step={1}
              value={yearBuilt}
              onChange={(e) => setYearBuilt(e.target.value)}
              placeholder="1995"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>
        </div>

        {err ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
            {err}
          </div>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Schätzung anzeigen
        </button>
      </form>

      {result ? (
        <div className="mt-5 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          {!result.cityRecognized ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-800">
              Stadt nicht in der Schnell-Datenbank — wir nutzen Bundes-Durchschnittswerte.
              Vollanalyse mit echten Mikromarkt-Daten gibt's im Investor Club.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <ResultStat label="Marktwert" big={result.formatted.marketValue} />
            <ResultStat label="Bandbreite" big={`${result.formatted.marketValueLow} – ${result.formatted.marketValueHigh}`} small />
            <ResultStat label="Sollmiete /m²" big={result.formatted.rentPerQm} />
            <ResultStat label="Sollmiete /Mon." big={result.formatted.monthlyRent} />
            <ResultStat label="Mietmultiplikator" big={result.formatted.rentMultiplier} />
            <ResultStat label="Bruttoanfangsrendite" big={result.formatted.grossYield} />
          </div>

          <div className="rounded-lg border border-indigo-300 bg-white p-3">
            <div className="text-xs font-semibold text-zinc-900">
              Du willst das präzise — mit Lage, Energiestatus und Off-Market-Vergleichen?
            </div>
            <div className="mt-1 text-[11px] text-zinc-600">
              Im Investor Club bekommst du die volle KI-Analyse mit Bietlimit, Cashflow,
              WALT und Marktvergleich auf Knopfdruck.
            </div>
            <Link
              href="/sign-up"
              className="mt-2 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Vollanalyse starten →
            </Link>
          </div>

          <div className="text-center text-[10px] text-zinc-500">
            Grobe Marktorientierung. Keine Investmentempfehlung.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultStat({
  label,
  big,
  small
}: {
  label: string;
  big: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div
        className={`mt-0.5 font-semibold tabular-nums text-zinc-900 ${
          small ? "text-xs" : "text-sm"
        }`}
      >
        {big}
      </div>
    </div>
  );
}
