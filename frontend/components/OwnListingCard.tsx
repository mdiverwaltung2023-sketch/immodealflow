"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ASSET_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  type ListingT,
  type ListingStatusT
} from "@/lib/api";

/**
 * Verkaeufer-Sicht der eigenen Inserate (Phase Listings-Visual-Refresh).
 * Bildlastige Variante mit Cover oben, Status-Pill, Kennzahlen-Grid und
 * direkten Aktions-Buttons (Bearbeiten + Anfragen).
 */

const STATUS_COLORS: Record<ListingStatusT, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_NEGOTIATION: "bg-amber-50 text-amber-800 border-amber-200",
  SOLD: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ARCHIVED: "bg-zinc-50 text-zinc-500 border-zinc-200"
};

function eur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function num(n: number, digits = 0): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(n);
}

export function OwnListingCard({ listing }: { listing: ListingT }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = listing.images;
  const cover = images[imgIdx];
  const hasMultiple = images.length > 1;

  const grossYield =
    listing.totalRent && listing.totalRent > 0 && listing.askingPrice > 0
      ? ((listing.totalRent * 12) / listing.askingPrice) * 100
      : null;
  const pricePerSqm =
    listing.totalArea > 0 ? listing.askingPrice / listing.totalArea : null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-lg hover:border-zinc-300">
      {/* Bild-Bereich */}
      <Link
        href={`/listings/${listing.id}/edit`}
        className="relative block aspect-[16/9] w-full overflow-hidden bg-zinc-100"
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
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
            className="absolute left-2 top-[28%] flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-700 opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
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
            className="absolute right-2 top-[28%] flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-700 opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </>
      ) : null}

      {/* Top-Left Status + Asset-Typ */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm ${STATUS_COLORS[listing.status]}`}
        >
          {LISTING_STATUS_LABELS[listing.status]}
        </span>
        <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 shadow-sm">
          {ASSET_TYPE_LABELS[listing.propertyType]}
        </span>
      </div>

      {/* Top-Right Bilderzähler */}
      {images.length > 0 ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-zinc-900/80 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
          {images.length} Bild{images.length === 1 ? "" : "er"}
        </div>
      ) : null}

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Preis + Lage */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-lg font-bold tracking-tight text-zinc-900">
              {eur(listing.askingPrice)}
            </div>
            {pricePerSqm != null ? (
              <div className="text-xs text-zinc-500">
                {eur(Math.round(pricePerSqm))}/m²
              </div>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">
              {listing.city}
              {listing.district ? ` · ${listing.district}` : ""}
            </span>
          </div>
        </div>

        {/* Titel */}
        <Link
          href={`/listings/${listing.id}/edit`}
          className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-indigo-700"
        >
          {listing.title}
        </Link>

        {/* Kennzahlen */}
        <div className="mt-1 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-2">
          <Metric label="Fläche" value={`${num(listing.totalArea)} m²`} />
          <Metric
            label="Miete"
            value={listing.totalRent ? `${eur(listing.totalRent)}` : "—"}
          />
          <Metric
            label="Rendite"
            value={grossYield != null ? `${num(grossYield, 1)}%` : "—"}
            highlight={grossYield != null && grossYield >= 5}
          />
        </div>

        {/* Aktionen */}
        <div className="mt-auto flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
          <Link
            href={`/listings/${listing.id}/edit`}
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Bearbeiten
          </Link>
          <Link
            href={`/listings/${listing.id}/inquiries`}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Anfragen
          </Link>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div
        className={`mt-0.5 truncate text-xs font-semibold ${
          highlight ? "text-emerald-700" : "text-zinc-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
