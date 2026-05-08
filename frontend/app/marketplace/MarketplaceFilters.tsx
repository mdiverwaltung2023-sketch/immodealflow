"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ASSET_TYPE_LABELS,
  AssetTypeEnum,
  ENERGY_CLASS_LABELS,
  EnergyClassEnum,
  type AssetTypeT,
  type EnergyClassT
} from "@/lib/api";

const ASSET_TYPES = AssetTypeEnum.options;
const ENERGY_CLASSES = EnergyClassEnum.options;

export type MarketplaceFilterState = {
  city: string;
  type: AssetTypeT | "";
  priceMin: string;
  priceMax: string;
  areaMin: string;
  // USP-Filter
  yieldMin: string;
  waltMin: string;
  energyMin: EnergyClassT | "";
  fullyRented: boolean;
  offMarket: boolean;
  withAnchor: boolean;
  modernizationOnly: boolean;
  indexedRent: boolean;
};

type Props = {
  initial: MarketplaceFilterState;
  variant?: "sidebar" | "horizontal";
};

export function MarketplaceFilters({ initial, variant = "sidebar" }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(initial.city);
  const [type, setType] = useState<AssetTypeT | "">(initial.type);
  const [priceMin, setPriceMin] = useState(initial.priceMin);
  const [priceMax, setPriceMax] = useState(initial.priceMax);
  const [areaMin, setAreaMin] = useState(initial.areaMin);
  // USP-Filter State
  const [yieldMin, setYieldMin] = useState(initial.yieldMin);
  const [waltMin, setWaltMin] = useState(initial.waltMin);
  const [energyMin, setEnergyMin] = useState<EnergyClassT | "">(initial.energyMin);
  const [fullyRented, setFullyRented] = useState(initial.fullyRented);
  const [offMarket, setOffMarket] = useState(initial.offMarket);
  const [withAnchor, setWithAnchor] = useState(initial.withAnchor);
  const [modernizationOnly, setModernizationOnly] = useState(initial.modernizationOnly);
  const [indexedRent, setIndexedRent] = useState(initial.indexedRent);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCity(initial.city);
    setType(initial.type);
    setPriceMin(initial.priceMin);
    setPriceMax(initial.priceMax);
    setAreaMin(initial.areaMin);
    setYieldMin(initial.yieldMin);
    setWaltMin(initial.waltMin);
    setEnergyMin(initial.energyMin);
    setFullyRented(initial.fullyRented);
    setOffMarket(initial.offMarket);
    setWithAnchor(initial.withAnchor);
    setModernizationOnly(initial.modernizationOnly);
    setIndexedRent(initial.indexedRent);
  }, [
    initial.city, initial.type, initial.priceMin, initial.priceMax, initial.areaMin,
    initial.yieldMin, initial.waltMin, initial.energyMin,
    initial.fullyRented, initial.offMarket, initial.withAnchor,
    initial.modernizationOnly, initial.indexedRent
  ]);

  function buildUrl() {
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (type) params.set("type", type);
    if (priceMin && /^\d+$/.test(priceMin)) params.set("priceMin", priceMin);
    if (priceMax && /^\d+$/.test(priceMax)) params.set("priceMax", priceMax);
    if (areaMin && /^\d+(\.\d+)?$/.test(areaMin)) params.set("areaMin", areaMin);
    if (yieldMin && /^\d+(\.\d+)?$/.test(yieldMin)) params.set("yieldMin", yieldMin);
    if (waltMin && /^\d+(\.\d+)?$/.test(waltMin)) params.set("waltMin", waltMin);
    if (energyMin) params.set("energyMin", energyMin);
    if (fullyRented) params.set("fullyRented", "true");
    if (offMarket) params.set("offMarket", "true");
    if (withAnchor) params.set("withAnchor", "true");
    if (modernizationOnly) params.set("modernizationOnly", "true");
    if (indexedRent) params.set("indexedRent", "true");
    const qs = params.toString();
    return qs ? `/marketplace?${qs}` : "/marketplace";
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    router.push(buildUrl());
    setTimeout(() => setBusy(false), 600);
  }

  function reset() {
    setCity(""); setType(""); setPriceMin(""); setPriceMax(""); setAreaMin("");
    setYieldMin(""); setWaltMin(""); setEnergyMin("");
    setFullyRented(false); setOffMarket(false); setWithAnchor(false);
    setModernizationOnly(false); setIndexedRent(false);
    router.push("/marketplace");
  }

  const activeCount =
    (city ? 1 : 0) + (type ? 1 : 0) + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) +
    (areaMin ? 1 : 0) + (yieldMin ? 1 : 0) + (waltMin ? 1 : 0) + (energyMin ? 1 : 0) +
    (fullyRented ? 1 : 0) + (offMarket ? 1 : 0) + (withAnchor ? 1 : 0) +
    (modernizationOnly ? 1 : 0) + (indexedRent ? 1 : 0);

  // SIDEBAR Variante (immoscout-mässiges Vertikal-Layout)
  return (
    <form onSubmit={apply} className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">Filter</div>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Alle löschen ({activeCount})
          </button>
        ) : null}
      </div>

      {/* Standard-Filter */}
      <Field label="Stadt">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-5-5" />
          </svg>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="z. B. Berlin"
            className={`${inputCls} pl-9`}
          />
        </div>
      </Field>

      <Field label="Asset-Typ">
        <div className="grid grid-cols-2 gap-2">
          <TypeChip active={type === ""} onClick={() => setType("")} label="Alle" />
          {ASSET_TYPES.map((t) => (
            <TypeChip
              key={t}
              active={type === t}
              onClick={() => setType(t)}
              label={ASSET_TYPE_LABELS[t]}
            />
          ))}
        </div>
      </Field>

      <Field label="Kaufpreis (EUR)">
        <div className="grid grid-cols-2 gap-2">
          <input
            inputMode="numeric" value={priceMin}
            onChange={(e) => setPriceMin(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="von" className={inputCls}
          />
          <input
            inputMode="numeric" value={priceMax}
            onChange={(e) => setPriceMax(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="bis" className={inputCls}
          />
        </div>
      </Field>

      <Field label="Mindestfläche (m²)">
        <input
          inputMode="decimal" value={areaMin}
          onChange={(e) => setAreaMin(e.target.value)}
          placeholder="z. B. 200" className={inputCls}
        />
      </Field>

      {/* USP-Sektion: Investor-Filter */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 -mx-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          Investor-Filter
        </div>
        <div className="mt-1 text-[11px] text-indigo-800/80">
          Was Privatkäufer-Portale nicht können — Cashflow & Bestandsqualität.
        </div>

        <div className="mt-3 space-y-3">
          <Field label="Min. Bruttorendite (%)">
            <input
              inputMode="decimal" value={yieldMin}
              onChange={(e) => setYieldMin(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="z. B. 5" className={inputCls}
            />
          </Field>

          <Field label="Min. WALT (Monate)">
            <input
              inputMode="decimal" value={waltMin}
              onChange={(e) => setWaltMin(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="z. B. 60 = 5 Jahre" className={inputCls}
            />
          </Field>

          <Field label="Min. Energieklasse">
            <select
              value={energyMin}
              onChange={(e) => setEnergyMin(e.target.value as EnergyClassT | "")}
              className={inputCls}
            >
              <option value="">— egal —</option>
              {ENERGY_CLASSES.map((c) => (
                <option key={c} value={c}>{ENERGY_CLASS_LABELS[c]} oder besser</option>
              ))}
            </select>
          </Field>

          <div className="space-y-2 pt-1">
            <Toggle
              label="Nur vollvermietet"
              hint="Leerstand ≤ 5 %"
              checked={fullyRented}
              onChange={setFullyRented}
            />
            <Toggle
              label="Indexmiete vorhanden"
              hint="Inflations-Schutz"
              checked={indexedRent}
              onChange={setIndexedRent}
            />
            <Toggle
              label="Mit Anchor-Tenant"
              hint="Bonität durch Hauptmieter"
              checked={withAnchor}
              onChange={setWithAnchor}
            />
            <Toggle
              label="Off-Market only"
              hint="Diskrete Verkäufe"
              checked={offMarket}
              onChange={setOffMarket}
            />
            <Toggle
              label="Modernisierungspotenzial"
              hint="Wertsteigerungs-Chance"
              checked={modernizationOnly}
              onChange={setModernizationOnly}
            />
          </div>
        </div>
      </div>

      <button type="submit" disabled={busy} className={primaryBtn + " w-full"}>
        {busy ? "Suche…" : "Filter anwenden"}
      </button>
    </form>
  );
}

/* ---------- Helpers ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function TypeChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
        active
          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-white/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 bg-white text-indigo-600 focus:ring-indigo-500"
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-zinc-800">{label}</span>
        {hint ? <span className="block text-[10px] text-zinc-500">{hint}</span> : null}
      </span>
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50";
