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

  // Filter aus URL bauen
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
        <div className="text-2xl font-semibold">Marketplace</div>
        <div className="mt-1 text-sm text-zinc-400">
          Aktive Inserate für MFH und Gewerbe. Lage-Details abhängig von der Anonymisierungsstufe des Verkäufers.
          Anfragen + Profil-Sichtbarkeit kommen mit Phase D.
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
          <div className="text-sm text-zinc-400">
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
                  className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition hover:border-zinc-700"
                >
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cover}
                      alt={l.images[0].alt ?? ""}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-zinc-900 text-xs text-zinc-600">
                      Kein Bild
                    </div>
                  )}
                  <div className="space-y-2 p-4">
                    <div className="text-sm font-semibold text-white group-hover:underline">
                      {l.title}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {ASSET_TYPE_LABELS[l.propertyType]} • {locationStr}
                    </div>
                    <div className="text-xs text-zinc-300">
                      {eur(l.askingPrice)} • {l.totalArea} m²
                      {l.totalRent ? ` • ${eur(l.totalRent)}/Mon.` : ""}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
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
