import { z } from "zod";
import {
  AssetTypeEnum,
  MarketplaceListingSchema,
  RatingSummarySchema,
  type AssetTypeT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { MarketplaceFilters } from "./MarketplaceFilters";
import { MarketplaceResults } from "./MarketplaceResults";
import { MarketplaceHero } from "./MarketplaceHero";

const MarketplaceListingWithRatingSchema = MarketplaceListingSchema.extend({
  sellerRating: RatingSummarySchema.optional()
});

const ListingsSchema = z.array(MarketplaceListingWithRatingSchema);

type Search = {
  city?: string;
  type?: string;
  priceMin?: string;
  priceMax?: string;
  areaMin?: string;
  sort?: string;
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

  // Sortierung clientseitig anwenden — Backend liefert Default-Reihenfolge
  const sortKey = searchParams?.sort ?? "newest";
  const sorted = [...listings].sort((a, b) => {
    switch (sortKey) {
      case "price-asc":
        return a.askingPrice - b.askingPrice;
      case "price-desc":
        return b.askingPrice - a.askingPrice;
      case "area-desc":
        return b.totalArea - a.totalArea;
      case "yield-desc": {
        const ya = a.totalRent ? (a.totalRent * 12) / a.askingPrice : -1;
        const yb = b.totalRent ? (b.totalRent * 12) / b.askingPrice : -1;
        return yb - ya;
      }
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const filters = {
    city: searchParams?.city ?? "",
    type: (AssetTypeEnum.safeParse(searchParams?.type ?? "").success
      ? (searchParams?.type as AssetTypeT)
      : "") as AssetTypeT | "",
    priceMin: searchParams?.priceMin ?? "",
    priceMax: searchParams?.priceMax ?? "",
    areaMin: searchParams?.areaMin ?? ""
  };

  return (
    <div className="space-y-6">
      <MarketplaceHero
        initial={filters}
        totalCount={listings.length}
      />

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        {/* Sidebar-Filter — auf Mobile als kollabierte Card */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <MarketplaceFilters initial={filters} variant="sidebar" />
          </div>
        </aside>

        {/* Ergebnisse */}
        <MarketplaceResults
          listings={sorted}
          totalCount={listings.length}
          activeSort={sortKey}
        />
      </div>
    </div>
  );
}
