import Link from "next/link";
import { z } from "zod";
import {
  ListingSchema,
  SellerInquirySchema
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { InquiryRow } from "./InquiryRow";

const InquiriesSchema = z.array(SellerInquirySchema);

export default async function ListingInquiriesPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const [listing, inquiries] = await Promise.all([
    apiGet(`/me/listings/${params.id}`, ListingSchema),
    apiGet(`/me/listings/${params.id}/inquiries`, InquiriesSchema)
  ]);

  const pending = inquiries.filter((i) => i.status === "PENDING");
  const others = inquiries.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold">Anfragen</div>
          <div className="mt-1 text-sm text-zinc-400">{listing.title}</div>
        </div>
        <Link
          href={`/listings/${params.id}/edit`}
          className="text-sm text-zinc-300 hover:underline"
        >
          ← Zum Listing
        </Link>
      </div>

      <Card title={`Offene Anfragen (${pending.length})`}>
        {pending.length === 0 ? (
          <div className="text-sm text-zinc-400">
            Keine offenen Anfragen. Stelle dein Listing auf{" "}
            <span className="font-semibold text-white">Aktiv</span>, damit Investoren es sehen.
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
