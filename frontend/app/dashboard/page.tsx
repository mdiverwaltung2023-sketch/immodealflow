import Link from "next/link";
import { z } from "zod";
import {
  PropertyListItemSchema,
  ListingSchema,
  MarketplaceListingSchema,
  RatingSummarySchema,
  SaleProcessListItemSchema,
  InquiryReceivedSchema
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { ClaimLegacyBanner } from "./ClaimLegacyBanner";
import { DashboardSwitcher } from "./DashboardSwitcher";

const PropertiesSchema = z.array(PropertyListItemSchema);
const MyListingsSchema = z.array(ListingSchema);
const MarketplaceListingWithRatingSchema = MarketplaceListingSchema.extend({
  sellerRating: RatingSummarySchema.optional()
});
const MarketplaceSchema = z.array(MarketplaceListingWithRatingSchema);
const SaleProcessesSchema = z.array(SaleProcessListItemSchema);
const InquiriesReceivedSchema = z.array(InquiryReceivedSchema);

export default async function DashboardPage() {
  const me = await requireOnboardedUser();

  // Alle Datenquellen parallel — jede mit eigenem Fallback, damit ein
  // 404 oder Fehler nicht die ganze Seite kippt. Verkäufer-Daten
  // (saleProcesses, pendingInquiries) fragen wir IMMER ab, weil die
  // Switcher-Component erst Client-side entscheidet, welche View kommt
  // (Hydration-Flicker vermeiden).
  const [
    properties,
    myListings,
    marketplace,
    saleProcesses,
    pendingInquiries
  ] = await Promise.all([
    apiGet("/properties", PropertiesSchema).catch(() => []),
    apiGet("/me/listings", MyListingsSchema).catch(() => []),
    apiGet("/marketplace", MarketplaceSchema).catch(() => []),
    apiGet("/me/sale-processes?active=true", SaleProcessesSchema).catch(() => []),
    apiGet("/me/inquiries-received?status=PENDING", InquiriesReceivedSchema).catch(() => [])
  ]);

  return (
    <div className="space-y-8">
      <ClaimLegacyBanner count={me.legacyCount ?? 0} />

      {/* Hero-Header: Begrüßung */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">
            Willkommen zurück{me.name ? `, ${me.name.split(" ")[0]}` : ""}.
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            {me.role === "SELLER"
              ? "Deine Verkäufer-Sicht — Inserate, Anfragen, Verkaufs-Pipeline."
              : me.role === "INVESTOR"
                ? "Deine Investor-Sicht — Watchlist, Marketplace, ZVG."
                : "Doppelrolle — über den Sidebar-Toggle wechselst du zwischen Investor- und Verkäufer-Sicht."}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/marketplace"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Marketplace
          </Link>
          <Link
            href="/listings/new"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Inserat anlegen
          </Link>
        </div>
      </div>

      <DashboardSwitcher
        role={me.role}
        properties={properties}
        myListings={myListings}
        marketplace={marketplace}
        saleProcesses={saleProcesses}
        pendingInquiries={pendingInquiries}
      />
    </div>
  );
}
