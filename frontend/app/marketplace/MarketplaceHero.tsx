"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSET_TYPE_LABELS,
  AssetTypeEnum,
  type AssetTypeT
} from "@/lib/api";
import type { MarketplaceFilterState } from "./MarketplaceFilters";

const ASSET_TYPES = AssetTypeEnum.options;

/**
 * USP-Quick-Presets — jeder Preset triggert einen echten Investor-Filter,
 * den Privatkäufer-Portale gar nicht haben.
 */
const QUICK_PRESETS: { label: string; tone: "indigo" | "amber" | "emerald" | "rose"; params: Record<string, string> }[] = [
  {
    label: "Renditestark (≥ 5 % brutto)",
    tone: "emerald",
    params: { yieldMin: "5", sort: "yield-desc" }
  },
  {
    label: "Off-Market Bestand",
    tone: "indigo",
    params: { offMarket: "true" }
  },
  {
    label: "Vollvermietet + Indexmiete",
    tone: "emerald",
    params: { fullyRented: "true", indexedRent: "true" }
  },
  {
    label: "Anchor-Tenant Gewerbe",
    tone: "amber",
    params: { type: "COMMERCIAL", withAnchor: "true" }
  },
  {
    label: "WALT 5+ Jahre",
    tone: "indigo",
    params: { waltMin: "60" }
  },
  {
    label: "Modernisierungschancen",
    tone: "rose",
    params: { modernizationOnly: "true" }
  }
];

type Props = {
  initial: MarketplaceFilterState;
  totalCount: number;
};

export function MarketplaceHero({ initial, totalCount }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(initial.city);
  const [type, setType] = useState<AssetTypeT | "">(initial.type);
  const [priceMax, setPriceMax] = useState(initial.priceMax);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (type) params.set("type", type);
    if (priceMax && /^\d+$/.test(priceMax)) params.set("priceMax", priceMax);
    // Bestehende area/priceMin nicht verlieren
    if (initial.priceMin) params.set("priceMin", initial.priceMin);
    if (initial.areaMin) params.set("areaMin", initial.areaMin);
    const qs = params.toString();
    router.push(qs ? `/marketplace?${qs}` : "/marketplace");
  }

  function applyPreset(p: Record<string, string>) {
    const params = new URLSearchParams(p);
    router.push(`/marketplace?${params.toString()}`);
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900 p-6 shadow-lg lg:p-8">
      {/* Decoration */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-amber-400/10 blur-2xl" />

      <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
              Marketplace
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white lg:text-3xl">
              Immobilien finden, die zu deinem Profil passen.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100">
              {totalCount.toLocaleString("de-DE")} aktive Inserate. Verkäufer sehen dein
              Investor-Profil — Bonität, Trackrecord, Finanzierungsstatus — bevor sie zusagen.
            </p>
          </div>
        </div>

        {/* Such-Bar */}
        <form
          onSubmit={search}
          className="mt-6 grid gap-2 rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur md:grid-cols-[1fr,1fr,1fr,auto]"
        >
          <div className="flex items-center gap-2 rounded-lg px-3 ring-1 ring-zinc-200 focus-within:ring-2 focus-within:ring-indigo-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-500">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Stadt — z. B. Berlin, München, Hamburg"
              className="h-10 w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg px-3 ring-1 ring-zinc-200 focus-within:ring-2 focus-within:ring-indigo-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-500">
              <path d="M3 9l9-6 9 6" />
              <path d="M5 9v11h14V9" />
            </svg>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AssetTypeT | "")}
              className="h-10 w-full bg-transparent text-sm text-zinc-900 focus:outline-none"
            >
              <option value="">Alle Asset-Typen</option>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-lg px-3 ring-1 ring-zinc-200 focus-within:ring-2 focus-within:ring-indigo-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-500">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <input
              inputMode="numeric"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Max. Preis (EUR)"
              className="h-10 w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 md:h-auto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-5-5" />
            </svg>
            Suchen
          </button>
        </form>

        {/* USP-Quick-Presets — investor-spezifische Suchen */}
        <div className="mt-4">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-indigo-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            USP-Suchen — kein Privatkäufer-Krempel
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.params)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 hover:border-white/50"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/70" />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
