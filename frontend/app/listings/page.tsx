import Link from "next/link";
import { z } from "zod";
import {
  LISTING_STATUS_LABELS,
  ListingSchema,
  type ListingStatusT,
  LISTING_STATUS_ORDER
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { DemoSeedButton } from "@/components/DemoSeedButton";
import { OwnListingCard } from "@/components/OwnListingCard";

const ListingsSchema = z.array(ListingSchema);

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

  // Sortierung: aktive zuerst, dann nach updatedAt absteigend
  const STATUS_RANK: Record<ListingStatusT, number> = {
    ACTIVE: 0,
    IN_NEGOTIATION: 1,
    DRAFT: 2,
    SOLD: 3,
    ARCHIVED: 4
  };
  const sorted = [...listings].sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Meine Inserate</div>
          <div className="mt-1 text-sm text-zinc-500">
            Eigene Verkaufs-Inserate für den Marketplace. Verkäufer-Sicht.
          </div>
        </div>
        <Link
          href="/listings/new"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Inserat anlegen
        </Link>
      </div>

      <Card title="Status-Übersicht">
        <div className="flex flex-wrap gap-2">
          {LISTING_STATUS_ORDER.map((s) => (
            <div
              key={s}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600"
            >
              {LISTING_STATUS_LABELS[s]}:{" "}
              <span className="font-semibold text-zinc-900">{counts[s]}</span>
            </div>
          ))}
        </div>
      </Card>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <div className="text-sm text-zinc-600">
            Noch keine Inserate. Lege über{" "}
            <Link
              href="/listings/new"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              „Inserat anlegen"
            </Link>{" "}
            ein erstes Inserat als Entwurf an — oder nutze den Knopf unten, um
            Beispiel-Inserate mit Bildern zu laden.
          </div>
          <div className="mt-4">
            <DemoSeedButton />
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 text-sm text-zinc-500">
            {listings.length} Inserat{listings.length === 1 ? "" : "e"} insgesamt
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((l) => (
              <OwnListingCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
