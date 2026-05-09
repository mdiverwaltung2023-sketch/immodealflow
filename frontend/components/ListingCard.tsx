"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ASSET_TYPE_LABELS,
  ENERGY_CLASS_LABELS,
  type EnergyClassT,
  type MarketplaceListingT,
  type RatingSummaryT
} from "@/lib/api";
import { StarSummary } from "@/components/StarRating";

type Props = {
  listing: MarketplaceListingT & { sellerRating?: RatingSummaryT | null };
  /** Wenn true, kompakte Variante (für Dashboard). */
  compact?: boolean;
};

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

function isFresh(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

export function ListingCard({ listing, compact = false }: Props) {
  const [imgIdx, setImgIdx] = useState(0);
  const [saved, setSaved] = useState(false);

  const images = listing.images;
  const cover = images[imgIdx];
  const hasMultiple = images.length > 1;
  const fresh = isFresh(listing.createdAt);

  const pricePerSqm = listing.totalArea > 0 ? listing.askingPrice / listing.totalArea : null;
  const grossYield =
    listing.totalRent && listing.totalRent > 0
      ? ((listing.totalRent * 12) / listing.askingPrice) * 100
      : null;

  const locationStr = [listing.city, listing.district].filter(Boolean).join(" · ");

  // Phase H6 — Coin-Sortier-Indikatoren:
  //   coinHighlighted (50 Coins/7d): gelber 2px-Rand + Pill
  //   coinFeedBoosted (100 Coins/30d): orangefarbenes Pill
  // Stripe-Premium (`featured`) hat visuell Vorrang — bei Premium wird der
  // Coin-Highlight-Rand unterdrueckt, das Pill bleibt aber sichtbar.
  const showHighlightFrame = listing.coinHighlighted && !listing.featured;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg ${
        showHighlightFrame
          ? "border-2 border-amber-400"
          : "border border-zinc-200 hover:border-zinc-300"
      }`}
    >
      {/* Bild-Bereich */}
      <Link
        href={`/marketplace/${listing.id}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-zinc-100"
      >
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover.url}
            alt={cover.alt ?? listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-zinc-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5-9 9" />
            </svg>
            <span>Kein Bild</span>
          </div>
        )}

        {/* Subtiler Gradient unten */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
      </Link>

      {/* Carousel-Pfeile */}
      {hasMultiple ? (
        <>
          <button
            type="button"
            aria-label="Vorheriges Bild"
            onClick={(e) => {
              e.preventDefault();
              setImgIdx((i) => (i - 1 + images.length) % images.length);
            }}
            className="absolute left-2 top-[40%] flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-700 opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Nächstes Bild"
            onClick={(e) => {
              e.preventDefault();
              setImgIdx((i) => (i + 1) % images.length);
            }}
            className="absolute right-2 top-[40%] flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-700 opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition ${i === imgIdx ? "bg-white w-4" : "bg-white/60"}`}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Top-Left Badges */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5 max-w-[80%]">
        {/* Premium ist die wichtigste Auszeichnung — kommt immer zuerst */}
        {listing.featured ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-br from-indigo-600 to-violet-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
            </svg>
            Premium
          </span>
        ) : null}
        {fresh ? (
          <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
            Neu
          </span>
        ) : null}
        <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 shadow">
          {ASSET_TYPE_LABELS[listing.propertyType]}
        </span>
        {listing.highlights?.includes("Off-Market") ? (
          <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
            Off-Market
          </span>
        ) : null}
        {listing.highlights?.includes("Vollvermietet") ? (
          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 shadow">
            Vollvermietet
          </span>
        ) : null}
        {listing.coinHighlighted ? (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
            title="Coin-Highlight aktiv"
          >
            <span aria-hidden>✨</span>
            Highlight
          </span>
        ) : null}
        {listing.coinFeedBoosted ? (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow"
            title="Verkäufer hat einen Feed-Boost aktiv"
          >
            <span aria-hidden>📈</span>
            Boost
          </span>
        ) : null}
      </div>

      {/* Top-Right Save-Heart */}
      <button
        type="button"
        aria-label={saved ? "Aus Merkliste entfernen" : "Merken"}
        onClick={(e) => {
          e.preventDefault();
          setSaved((s) => !s);
        }}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-zinc-700 shadow transition hover:bg-white"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={saved ? "#e11d48" : "none"}
          stroke={saved ? "#e11d48" : "currentColor"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      </button>

      {/* Body */}
      <Link
        href={`/marketplace/${listing.id}`}
        className="flex flex-1 flex-col gap-3 p-4"
      >
        {/* Preis + Lage */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold tracking-tight text-zinc-900">
              {eur(listing.askingPrice)}
            </div>
            {pricePerSqm != null ? (
              <div className="text-xs text-zinc-500">
                {eur(Math.round(pricePerSqm))}/m²
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{locationStr || "Lage anonym"}</span>
          </div>
        </div>

        {/* Titel */}
        <div className="line-clamp-2 text-sm font-semibold text-zinc-900 group-hover:text-indigo-700">
          {listing.title}
        </div>

        {/* Investor-Kennzahlen-Reihe: Mietmultiplikator, WALT, Einheiten, Bj, Energie */}
        {(() => {
          const rentMultiplier =
            listing.totalRent && listing.totalRent > 0
              ? listing.askingPrice / (listing.totalRent * 12)
              : null;
          const waltYears =
            listing.waltMonths != null ? listing.waltMonths / 12 : null;
          const hasAny =
            rentMultiplier != null ||
            waltYears != null ||
            (listing.residentialUnits != null && listing.residentialUnits > 0) ||
            (listing.commercialUnits != null && listing.commercialUnits > 0) ||
            listing.energyClass ||
            listing.yearBuilt ||
            listing.rentIndexed === true;
          if (!hasAny) return null;
          return (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {rentMultiplier != null ? (
                <span
                  className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-semibold text-indigo-700"
                  title="Mietmultiplikator (Kaufpreis / Jahreskaltmiete)"
                >
                  {num(rentMultiplier, 1)}-fach
                </span>
              ) : null}
              {waltYears != null ? (
                <span
                  className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-semibold text-emerald-700"
                  title="Gewichtete Restmietdauer"
                >
                  WALT {num(waltYears, 1)}J
                </span>
              ) : null}
              {listing.rentIndexed === true ? (
                <span
                  className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 font-semibold text-amber-800"
                  title="Indexmiete vorhanden"
                >
                  Indexmiete
                </span>
              ) : null}
              {listing.residentialUnits && listing.residentialUnits > 0 ? (
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700">
                  {listing.residentialUnits} WE
                </span>
              ) : null}
              {listing.commercialUnits && listing.commercialUnits > 0 ? (
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700">
                  {listing.commercialUnits} GE
                </span>
              ) : null}
              {listing.yearBuilt ? (
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700">
                  Bj. {listing.yearBuilt}
                </span>
              ) : null}
              {listing.energyClass ? <EnergyPill cls={listing.energyClass} /> : null}
            </div>
          );
        })()}

        {/* Kennzahlen-Reihe */}
        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3">
          <Metric
            label="Fläche"
            value={`${num(listing.totalArea)} m²`}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V3h4" />
                <path d="M21 7V3h-4" />
                <path d="M3 17v4h4" />
                <path d="M21 17v4h-4" />
              </svg>
            }
          />
          <Metric
            label="Miete"
            value={listing.totalRent ? `${eur(listing.totalRent)}` : "—"}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
          />
          <Metric
            label="Rendite"
            value={grossYield != null ? `${num(grossYield, 1)}%` : "—"}
            highlight={grossYield != null && grossYield >= 5}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            }
          />
        </div>

        {!compact ? (
          <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500">
            <span className="truncate inline-flex items-center gap-1">
              Verkäufer: <span className="text-zinc-700">{listing.owner.name ?? "Anonym"}</span>
              {listing.ownerVerified ? (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700"
                  title="Verifiziert (Pro-Plan)"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  verif.
                </span>
              ) : null}
            </span>
            <StarSummary summary={listing.sellerRating ?? null} size="sm" withCount />
          </div>
        ) : null}
      </Link>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  highlight = false
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-0.5 truncate text-xs font-semibold ${highlight ? "text-emerald-700" : "text-zinc-800"}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * Farb-Pill für die Energieklasse — wie auf den Energieausweisen üblich.
 */
export function EnergyPill({ cls, size = "sm" }: { cls: EnergyClassT; size?: "sm" | "md" }) {
  const colorMap: Record<EnergyClassT, string> = {
    A_PLUS: "bg-emerald-600 text-white",
    A: "bg-emerald-500 text-white",
    B: "bg-lime-500 text-white",
    C: "bg-yellow-400 text-zinc-900",
    D: "bg-amber-400 text-zinc-900",
    E: "bg-orange-500 text-white",
    F: "bg-orange-600 text-white",
    G: "bg-red-600 text-white",
    H: "bg-red-700 text-white"
  };
  const sizeCls = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded font-semibold ${sizeCls} ${colorMap[cls]}`}>
      <span aria-hidden>⚡</span>
      <span>{ENERGY_CLASS_LABELS[cls]}</span>
    </span>
  );
}
