"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import type { MarketplaceListingT, RatingSummaryT } from "@/lib/api";

type ListingWithRating = MarketplaceListingT & { sellerRating?: RatingSummaryT | null };

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Neueste zuerst" },
  { value: "price-asc", label: "Preis aufsteigend" },
  { value: "price-desc", label: "Preis absteigend" },
  { value: "area-desc", label: "Größte Fläche zuerst" },
  { value: "yield-desc", label: "Höchste Rendite zuerst" }
];

type Props = {
  listings: ListingWithRating[];
  totalCount: number;
  activeSort: string;
};

export function MarketplaceResults({ listings, totalCount, activeSort }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function changeSort(next: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("sort", next);
    router.push(`/marketplace?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="text-sm text-zinc-600">
          <span className="font-semibold text-zinc-900">{listings.length}</span>{" "}
          {listings.length === 1 ? "Inserat" : "Inserate"}
          {listings.length !== totalCount ? (
            <span className="text-zinc-500"> von {totalCount}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="hidden sm:inline">Sortieren:</span>
            <select
              value={activeSort}
              onChange={(e) => changeSort(e.target.value)}
              className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Results */}
      {listings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {listings.length >= 24 ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center text-xs text-zinc-500">
          Aktuell siehst du die ersten {listings.length} Treffer. Pagination folgt mit
          mehr Inseraten.
        </div>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-5-5" />
        </svg>
      </div>
      <div className="mt-4 text-base font-semibold text-zinc-900">
        Keine Inserate für deine Filter gefunden.
      </div>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
        Versuche eine größere Stadt, eine breitere Preisspanne oder einen anderen Asset-Typ.
        Du kannst auch{" "}
        <Link href="/listings/new" className="font-medium text-indigo-600 hover:text-indigo-700">
          dein eigenes Listing anlegen
        </Link>
        .
      </p>
      <Link
        href="/marketplace"
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Filter zurücksetzen
      </Link>
    </div>
  );
}
