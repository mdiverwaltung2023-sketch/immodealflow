"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ASSET_TYPE_LABELS,
  AssetTypeEnum,
  type AssetTypeT
} from "@/lib/api";

const ASSET_TYPES = AssetTypeEnum.options;

type Props = {
  initial: {
    city: string;
    type: AssetTypeT | "";
    priceMin: string;
    priceMax: string;
    areaMin: string;
  };
  /** Wenn "sidebar", Vertikal-Layout für links; sonst horizontal. */
  variant?: "sidebar" | "horizontal";
};

export function MarketplaceFilters({ initial, variant = "sidebar" }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(initial.city);
  const [type, setType] = useState<AssetTypeT | "">(initial.type);
  const [priceMin, setPriceMin] = useState(initial.priceMin);
  const [priceMax, setPriceMax] = useState(initial.priceMax);
  const [areaMin, setAreaMin] = useState(initial.areaMin);
  const [busy, setBusy] = useState(false);

  // Synchronisiert State, wenn URL-Filter sich ändern (z. B. zurück-Navigation)
  useEffect(() => {
    setCity(initial.city);
    setType(initial.type);
    setPriceMin(initial.priceMin);
    setPriceMax(initial.priceMax);
    setAreaMin(initial.areaMin);
  }, [initial.city, initial.type, initial.priceMin, initial.priceMax, initial.areaMin]);

  function buildUrl() {
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (type) params.set("type", type);
    if (priceMin && /^\d+$/.test(priceMin)) params.set("priceMin", priceMin);
    if (priceMax && /^\d+$/.test(priceMax)) params.set("priceMax", priceMax);
    if (areaMin && /^\d+(\.\d+)?$/.test(areaMin)) params.set("areaMin", areaMin);
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
    setCity("");
    setType("");
    setPriceMin("");
    setPriceMax("");
    setAreaMin("");
    router.push("/marketplace");
  }

  const activeCount =
    (city ? 1 : 0) +
    (type ? 1 : 0) +
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    (areaMin ? 1 : 0);

  if (variant === "horizontal") {
    return (
      <form onSubmit={apply} className="grid gap-3 md:grid-cols-5">
        <FieldInline label="Stadt">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="z. B. Berlin"
            className={inputCls}
          />
        </FieldInline>
        <FieldInline label="Asset-Typ">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AssetTypeT | "")}
            className={inputCls}
          >
            <option value="">Alle</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </FieldInline>
        <FieldInline label="Preis ab">
          <input
            inputMode="numeric"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="EUR"
            className={inputCls}
          />
        </FieldInline>
        <FieldInline label="Preis bis">
          <input
            inputMode="numeric"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="EUR"
            className={inputCls}
          />
        </FieldInline>
        <FieldInline label="Min. Fläche">
          <input
            inputMode="decimal"
            value={areaMin}
            onChange={(e) => setAreaMin(e.target.value)}
            placeholder="m²"
            className={inputCls}
          />
        </FieldInline>
        <div className="md:col-span-5 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy} className={primaryBtn}>
            Filter anwenden
          </button>
          {activeCount > 0 ? (
            <button type="button" onClick={reset} className={ghostBtn}>
              Zurücksetzen ({activeCount})
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  // SIDEBAR Variante
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
          <TypeChip
            active={type === ""}
            onClick={() => setType("")}
            label="Alle"
          />
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
            inputMode="numeric"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="von"
            className={inputCls}
          />
          <input
            inputMode="numeric"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="bis"
            className={inputCls}
          />
        </div>
      </Field>

      <Field label="Mindestfläche (m²)">
        <input
          inputMode="decimal"
          value={areaMin}
          onChange={(e) => setAreaMin(e.target.value)}
          placeholder="z. B. 200"
          className={inputCls}
        />
      </Field>

      <button type="submit" disabled={busy} className={primaryBtn + " w-full"}>
        {busy ? "Suche…" : "Filter anwenden"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function FieldInline({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function TypeChip({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
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

const inputCls =
  "h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50";

const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50";
