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
  const me = await requireOnboardedUser();
  const userPlan = me.plan ?? "FREE";

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
  // Off-Market ist Investor-Pro-Feature — Free-User dürfen den Filter nicht setzen.
  // Wir stripen ihn lieber clientseitig, statt das Backend mit 402 zu antworten
  // und die SSR-Page zu crashen.
  const offMarketRequested = truthy(searchParams?.offMarket);
  const offMarketStripped = offMarketRequested && userPlan !== "INVESTOR_PRO";
  if (offMarketRequested && userPlan === "INVESTOR_PRO") {
    params.set("offMarket", "true");
  }
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

      {offMarketStripped ? (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-indigo-900">Off-Market-Filter ist Investor-Pro-Feature</div>
            <div className="mt-0.5 text-xs text-indigo-800/90">
              Wir zeigen dir die regulären Inserate. Schalte Off-Market mit Investor Pro frei.
            </div>
          </div>
          <a
            href="/pricing"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Tarife ansehen
          </a>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <MarketplaceFilters initial={filters} variant="sidebar" userPlan={userPlan} />
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
