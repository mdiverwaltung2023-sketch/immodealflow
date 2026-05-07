import Link from "next/link";
import {
  ListingSchema,
  ListingInquiriesResponseSchema,
  LISTING_STATUS_LABELS
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { InquiryRow } from "./InquiryRow";

export default async function ListingInquiriesPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const [listing, response] = await Promise.all([
    apiGet(`/me/listings/${params.id}`, ListingSchema),
    apiGet(`/me/listings/${params.id}/inquiries`, ListingInquiriesResponseSchema)
  ]);

  const inquiries = response.inquiries;
  const pending = inquiries.filter((i) => i.status === "PENDING");
  const others = inquiries.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold text-zinc-900">Anfragen</div>
          <div className="mt-1 text-sm text-zinc-500">
            {listing.title} • Status:{" "}
            <span className="font-semibold text-zinc-900">
              {LISTING_STATUS_LABELS[response.listingStatus]}
            </span>
          </div>
          {response.listingStatus === "IN_NEGOTIATION" ? (
            <div className="mt-2 text-xs text-zinc-500">
              Setze den Status auf <span className="font-semibold">Verkauft</span> im Listing-Edit,
              sobald der Notartermin durch ist — danach könnt ihr euch gegenseitig bewerten.
            </div>
          ) : null}
        </div>
        <Link
          href={`/listings/${params.id}/edit`}
          className="text-sm text-zinc-600 hover:text-indigo-700 hover:underline"
        >
          ← Zum Listing
        </Link>
      </div>

      <Card title={`Offene Anfragen (${pending.length})`}>
        {pending.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Keine offenen Anfragen. Stelle dein Listing auf{" "}
            <span className="font-semibold text-zinc-900">Aktiv</span>, damit Investoren es sehen.
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((inq) => (
              <InquiryRow key={inq.id} inquiry={inq} listingTitle={listing.title} />
            ))}
          </div>
        )}
      </Card>

      {others.length > 0 ? (
        <Card title={`Bereits beantwortet (${others.length})`}>
          <div className="space-y-4">
            {others.map((inq) => (
              <InquiryRow key={inq.id} inquiry={inq} listingTitle={listing.title} />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
