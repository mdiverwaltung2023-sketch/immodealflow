import { z } from "zod";
import {
  AssetTypeEnum,
  EnergyClassEnum,
  MarketplaceListingSchema,
  RatingSummarySchema,
  type AssetTypeT,
  type EnergyClassT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { MarketplaceFilters, type MarketplaceFilterState } from "./MarketplaceFilters";
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
  yieldMin?: string;
  waltMin?: string;
  energyMin?: string;
  fullyRented?: string;
  offMarket?: string;
  withAnchor?: string;
  modernizationOnly?: string;
  indexedRent?: string;
  sort?: string;
};

const truthy = (v: string | undefined) => v === "true" || v === "1";

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
  if (searchParams?.yieldMin && /^\d+(\.\d+)?$/.test(searchParams.yieldMin)) {
    params.set("yieldMin", searchParams.yieldMin);
  }
  if (searchParams?.waltMin && /^\d+(\.\d+)?$/.test(searchParams.waltMin)) {
    params.set("waltMin", searchParams.waltMin);
  }
  if (searchParams?.energyMin) {
    const e = EnergyClassEnum.safeParse(searchParams.energyMin);
    if (e.success) params.set("energyMin", e.data);
  }
  if (truthy(searchParams?.fullyRented)) params.set("fullyRented", "true");
  if (truthy(searchParams?.offMarket)) params.set("offMarket", "true");
  if (truthy(searchParams?.withAnchor)) params.set("withAnchor", "true");
  if (truthy(searchParams?.modernizationOnly)) params.set("modernizationOnly", "true");
  if (truthy(searchParams?.indexedRent)) params.set("indexedRent", "true");

  const path = params.toString() ? `/marketplace?${params.toString()}` : "/marketplace";
  const listings = await apiGet(path, ListingsSchema);

  const sortKey = searchParams?.sort ?? "newest";
  const sorted = [...listings].sort((a, b) => {
    switch (sortKey) {
      case "price-asc": return a.askingPrice - b.askingPrice;
      case "price-desc": return b.askingPrice - a.askingPrice;
      case "area-desc": return b.totalArea - a.totalArea;
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

  const filters: MarketplaceFilterState = {
    city: searchParams?.city ?? "",
    type: (AssetTypeEnum.safeParse(searchParams?.type ?? "").success
      ? (searchParams?.type as AssetTypeT)
      : "") as AssetTypeT | "",
    priceMin: searchParams?.priceMin ?? "",
    priceMax: searchParams?.priceMax ?? "",
    areaMin: searchParams?.areaMin ?? "",
    yieldMin: searchParams?.yieldMin ?? "",
    waltMin: searchParams?.waltMin ?? "",
    energyMin: (EnergyClassEnum.safeParse(searchParams?.energyMin ?? "").success
      ? (searchParams?.energyMin as EnergyClassT)
      : "") as EnergyClassT | "",
    fullyRented: truthy(searchParams?.fullyRented),
    offMarket: truthy(searchParams?.offMarket),
    withAnchor: truthy(searchParams?.withAnchor),
    modernizationOnly: truthy(searchParams?.modernizationOnly),
    indexedRent: truthy(searchParams?.indexedRent)
  };

  return (
    <div className="space-y-6">
      <MarketplaceHero
        initial={filters}
        totalCount={listings.length}
      />

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <MarketplaceFilters initial={filters} variant="sidebar" />
          </div>
        </aside>

        <MarketplaceResults
          listings={sorted}
          totalCount={listings.length}
          activeSort={sortKey}
        />
      </div>
    </div>
  );
}
