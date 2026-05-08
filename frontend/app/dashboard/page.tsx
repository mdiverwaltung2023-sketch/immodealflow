import Link from "next/link";
import { z } from "zod";
import {
  PropertyListItemSchema,
  ListingSchema,
  MarketplaceListingSchema,
  RatingSummarySchema,
  type ListingStatusT,
  type DealStatus
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { ListingCard } from "@/components/ListingCard";
import { ClaimLegacyBanner } from "./ClaimLegacyBanner";

const PropertiesSchema = z.array(PropertyListItemSchema);
const MyListingsSchema = z.array(ListingSchema);
const MarketplaceListingWithRatingSchema = MarketplaceListingSchema.extend({
  sellerRating: RatingSummarySchema.optional()
});
const MarketplaceSchema = z.array(MarketplaceListingWithRatingSchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function DashboardPage() {
  const me = await requireOnboardedUser();

  // Daten parallel laden — alle individuell mit Fallback, damit ein 404 nicht
  // die ganze Seite kippt.
  const [properties, myListings, marketplace] = await Promise.all([
    apiGet("/properties", PropertiesSchema).catch(() => []),
    apiGet("/me/listings", MyListingsSchema).catch(() => []),
    apiGet("/marketplace", MarketplaceSchema).catch(() => [])
  ]);

  // KPIs ableiten
  const pipelineValue = properties.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const activeListings = myListings.filter((l) => l.status === "ACTIVE").length;
  const inNegotiation = myListings.filter((l) => l.status === "IN_NEGOTIATION").length;

  const dealStatusCounts: Record<DealStatus, number> = {
    WATCHING: 0,
    INQUIRED: 0,
    NEGOTIATING: 0,
    LOI: 0,
    NOTAR: 0,
    CLOSED: 0,
    REJECTED: 0
  };
  properties.forEach((p) => {
    dealStatusCounts[p.status]++;
  });

  const listingStatusCounts: Record<ListingStatusT, number> = {
    DRAFT: 0,
    ACTIVE: 0,
    IN_NEGOTIATION: 0,
    SOLD: 0,
    ARCHIVED: 0
  };
  myListings.forEach((l) => {
    listingStatusCounts[l.status]++;
  });

  // Top-6 Marketplace-Tiles für die "Inserate auf der ersten Seite"
  const tiles = marketplace.slice(0, 6);

  return (
    <div className="space-y-8">
      <ClaimLegacyBanner count={me.legacyCount ?? 0} />

      {/* Hero-Header: Begrüßung + primäre CTAs */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">
            Willkommen zurück{me.name ? `, ${me.name.split(" ")[0]}` : ""}.
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Marketplace für MFH und Gewerbe — Verkäufer sehen dein Investor-Profil.
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
            Listing anlegen
          </Link>
        </div>
      </div>

      {/* Quick-Action-Kacheln */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          href="/listings/new"
          title="Listing anlegen"
          subtitle="MFH oder Gewerbe inserieren"
          accent="indigo"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M3 9l9-6 9 6" />
              <path d="M5 9v11h14V9" />
              <path d="M12 14v4" />
              <path d="M10 16h4" />
            </svg>
          }
        />
        <QuickAction
          href="/marketplace"
          title="Marketplace"
          subtitle="Inserate durchsuchen"
          accent="emerald"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-5-5" />
            </svg>
          }
        />
        <QuickAction
          href="/inquiries"
          title="Anfragen"
          subtitle="Kontaktanfragen verwalten"
          accent="amber"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5 4h14l3 8v8H2v-8z" />
            </svg>
          }
        />
        <QuickAction
          href="/auctions/import"
          title="ZVG-Import"
          subtitle="Versteigerung importieren"
          accent="rose"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M14 14l6 6" />
              <path d="M5 13l6-6" />
              <path d="M9 3l8 8" />
              <path d="M3 21h8" />
            </svg>
          }
        />
      </div>

      {/* Hero-KPI + KPI-Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <HeroKpi
          label="Pipeline-Wert"
          value={pipelineValue > 0 ? eur(pipelineValue) : "—"}
          hint={`${properties.length} Properties verfolgt`}
        />
        <Kpi
          label="Aktive Listings"
          value={activeListings.toString()}
          hint={`${listingStatusCounts.DRAFT} Entwurf · ${inNegotiation} verhandeln`}
        />
        <Kpi
          label="Verkauft / SOLD"
          value={listingStatusCounts.SOLD.toString()}
          hint={`${myListings.length} Listings gesamt`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Mini label="In Verhandlung" value={dealStatusCounts.NEGOTIATING.toString()} />
        <Mini label="LOI" value={dealStatusCounts.LOI.toString()} />
        <Mini label="Notar" value={dealStatusCounts.NOTAR.toString()} />
        <Mini label="Gekauft" value={dealStatusCounts.CLOSED.toString()} />
      </div>

      {/* Marketplace-Tiles — Inserate */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-zinc-900">Aktuelle Inserate</div>
            <div className="text-xs text-zinc-500">
              {marketplace.length} Listings im Marketplace
            </div>
          </div>
          <Link
            href="/marketplace"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Alle ansehen →
          </Link>
        </div>

        {tiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <div className="text-sm text-zinc-600">
              Noch keine aktiven Inserate. Sei der Erste —{" "}
              <Link href="/listings/new" className="font-medium text-indigo-600 hover:text-indigo-700">
                Listing anlegen
              </Link>
              .
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tiles.map((l) => (
              <ListingCard key={l.id} listing={l} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Building blocks (server-safe) ---------- */

function QuickAction({
  href,
  title,
  subtitle,
  icon,
  accent
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "indigo" | "emerald" | "amber" | "rose";
}) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100"
  } as const;
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-zinc-300"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${accents[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-700">
          {title}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div>
      </div>
    </Link>
  );
}

function HeroKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm lg:col-span-1">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}
