import Link from "next/link";
import { z } from "zod";
import {
  LISTING_STATUS_LABELS,
  ListingSchema,
  ASSET_TYPE_LABELS,
  type ListingStatusT,
  LISTING_STATUS_ORDER
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";

const ListingsSchema = z.array(ListingSchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

const STATUS_COLORS: Record<ListingStatusT, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  IN_NEGOTIATION: "bg-amber-50 text-amber-700 border-amber-200",
  SOLD: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ARCHIVED: "bg-zinc-50 text-zinc-500 border-zinc-200"
};

export default async function MyListingsPage() {
  await requireOnboardedUser();
  const listings = await apiGet("/me/listings", ListingsSchema);

  const counts: Record<ListingStatusT | "ALL", number> = {
    ALL: listings.length,
    DRAFT: 0,
    ACTIVE: 0,
    IN_NEGOTIATION: 0,
    SOLD: 0,
    ARCHIVED: 0
  };
  listings.forEach((l) => {
    counts[l.status]++;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Meine Listings</div>
          <div className="mt-1 text-sm text-zinc-500">
            Verkaufs-Inserate für den Marketplace. Verkäufer-Sicht.
          </div>
        </div>
        <Link
          href="/listings/new"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Neues Listing
        </Link>
      </div>

      <Card title={`Listings (${listings.length})`}>
        {listings.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Noch keine Listings. Lege über „Neues Listing" ein erstes Inserat als Entwurf an.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {listings.map((l) => (
              <div key={l.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/listings/${l.id}/edit`}
                      className="text-sm font-semibold text-zinc-900 hover:text-indigo-700 hover:underline"
                    >
                      {l.title}
                    </Link>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[l.status]}`}
                    >
                      {LISTING_STATUS_LABELS[l.status]}
                    </span>
                    {l.images.length > 0 ? (
                      <span className="text-[10px] text-zinc-500">{l.images.length} Bild(er)</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {ASSET_TYPE_LABELS[l.propertyType]} • {l.city}
                    {l.district ? `, ${l.district}` : ""} • {l.totalArea} m² • Preis {eur(l.askingPrice)}
                    {l.totalRent ? ` • Miete ${eur(l.totalRent)}/Mon.` : ""}
                  </div>
                </div>
                <Link
                  href={`/listings/${l.id}/edit`}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                >
                  Bearbeiten
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Status-Übersicht">
        <div className="flex flex-wrap gap-2">
          {LISTING_STATUS_ORDER.map((s) => (
            <div key={s} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
              {LISTING_STATUS_LABELS[s]}: <span className="font-semibold text-zinc-900">{counts[s]}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
