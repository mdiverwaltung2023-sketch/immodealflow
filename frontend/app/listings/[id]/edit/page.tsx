import { ListingSchema } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { ListingEditor } from "./ListingEditor";
import { FeatureCheckoutButton } from "./FeatureCheckoutButton";
import Link from "next/link";

type Search = { premium?: string };

export default async function ListingEditPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: Search;
}) {
  await requireOnboardedUser();
  const listing = await apiGet(`/me/listings/${params.id}`, ListingSchema);

  const premiumSuccess = searchParams?.premium === "success";
  const premiumCancelled = searchParams?.premium === "cancelled";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold text-zinc-900">Inserat bearbeiten</div>
          <div className="mt-1 text-sm text-zinc-500">{listing.title}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/listings/${listing.id}/inquiries`}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Anfragen ansehen
          </Link>
          <Link href="/listings" className="text-sm text-zinc-600 hover:text-indigo-700 hover:underline">
            ← Zur Liste
          </Link>
        </div>
      </div>

      {premiumSuccess ? (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-semibold">Premium-Listing aktiviert.</div>
          <div className="mt-1 text-xs">
            Stripe-Webhook setzt die Restdauer in den nächsten Sekunden — falls die
            Premium-Box noch nicht „Aktiv" zeigt, einmal Seite neu laden.
          </div>
        </div>
      ) : null}
      {premiumCancelled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Premium-Checkout abgebrochen — kein Wechsel.
        </div>
      ) : null}

      <FeatureCheckoutButton
        listingId={listing.id}
        featuredUntil={listing.featuredUntil ?? null}
      />

      <Card title="Felder & Status">
        <ListingEditor initial={listing} />
      </Card>
    </div>
  );
}
