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

      <Card title="Felder & Status">
        <ListingEditor initial={listing} />
      </Card>
    </div>
  );
}
