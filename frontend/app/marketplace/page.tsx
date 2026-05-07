import Link from "next/link";
import { z } from "zod";
import {
  ASSET_TYPE_LABELS,
  AssetTypeEnum,
  MarketplaceListingSchema,
  RatingSummarySchema,
  type AssetTypeT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { StarSummary } from "@/components/StarRating";
import { MarketplaceFilters } from "./MarketplaceFilters";

const MarketplaceListingWithRatingSchema = MarketplaceListingSchema.extend({
  sellerRating: RatingSummarySchema.optional()
});

const ListingsSchema = z.array(MarketplaceListingWithRatingSchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

type Search = {
  city?: string;
  type?: string;
  priceMin?: string;
  priceMax?: string;
  areaMin?: string;
};

export default async function MarketplacePage({ searchParams }: { searchParams?: Search }) {
  await requireOnboardedUser();

  const params = new URLSearchParams();
  if (searchParams?.city) params.set("city", searchParams.city);
  if (searchParams?.type) {
    const t = AssetTypeEnum.safeParse(searchParams.type);
    if (t.success) params.set("type", t.data);
  }
  if (searchParams?.priceMin && /^\d+$/.test(searchParams.priceMin)) {
    params.set("priceMin", searchParams.priceMin);
  }
  if (searchParams?.priceMax && /^\d+$/.test(searchParams.priceMax)) {
    params.set("priceMax", searchParams.priceMax);
  }
  if (searchParams?.areaMin && /^\d+(\.\d+)?$/.test(searchParams.areaMin)) {
    params.set("areaMin", searchParams.areaMin);
  }

  const path = params.toString() ? `/marketplace?${params.toString()}` : "/marketplace";
  const listings = await apiGet(path, ListingsSchema);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Marketplace</div>
        <div className="mt-1 text-sm text-zinc-500">
          Aktive Inserate für MFH und Gewerbe. Lage-Details abhängig von der Anonymisierungsstufe des Verkäufers.
        </div>
      </div>

      <Card title="Filter">
        <MarketplaceFilters
          initial={{
            city: searchParams?.city ?? "",
            type: (AssetTypeEnum.safeParse(searchParams?.type ?? "").success
              ? (searchParams?.type as AssetTypeT)
              : "") as AssetTypeT | "",
            priceMin: searchParams?.priceMin ?? "",
            priceMax: searchParams?.priceMax ?? "",
            areaMin: searchParams?.areaMin ?? ""
          }}
        />
      </Card>

      <Card title={`Ergebnisse (${listings.length})`}>
        {listings.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Keine Listings passend zu deinem Filter. Versuche eine andere Stadt oder weitere Preisspanne.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => {
              const cover = l.images[0]?.url;
              const locationStr = [l.city, l.district].filter(Boolean).join(", ");
              return (
                <Link
                  key={l.id}
                  href={`/marketplace/${l.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md hover:border-zinc-300"
                >
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cover}
                      alt={l.images[0].alt ?? ""}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-zinc-100 text-xs text-zinc-400">
                      Kein Bild
                    </div>
                  )}
                  <div className="space-y-2 p-4">
                    <div className="text-[10px] uppercase tracking-wide text-indigo-600 font-semibold">
                      {ASSET_TYPE_LABELS[l.propertyType]}
                    </div>
                    <div className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-700 line-clamp-2">
                      {l.title}
                    </div>
                    <div className="text-xs text-zinc-500">{locationStr}</div>
                    <div className="text-sm font-semibold text-zinc-900 pt-1">
                      {eur(l.askingPrice)}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {l.totalArea} m²{l.totalRent ? ` · ${eur(l.totalRent)}/Mon.` : ""}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500">
                      <span>Verkäufer: {l.owner.name ?? "Anonym"}</span>
                      <StarSummary summary={l.sellerRating ?? null} size="sm" withCount />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
