import { ListingSchema } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { ListingEditor } from "./ListingEditor";
import Link from "next/link";

export default async function ListingEditPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const listing = await apiGet(`/me/listings/${params.id}`, ListingSchema);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold">Listing bearbeiten</div>
          <div className="mt-1 text-sm text-zinc-400">{listing.title}</div>
        </div>
        <Link href="/listings" className="text-sm text-zinc-300 hover:underline">
          ← Zur Liste
        </Link>
      </div>

      <Card title="Felder & Status">
        <ListingEditor initial={listing} />
      </Card>
    </div>
  );
}
