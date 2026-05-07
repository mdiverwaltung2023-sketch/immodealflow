import Link from "next/link";
import { z } from "zod";
import {
  ASSET_TYPE_LABELS,
  INQUIRY_STATUS_LABELS,
  MyInquirySchema,
  type InquiryStatusT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";

const InquiriesSchema = z.array(MyInquirySchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

const STATUS_COLORS: Record<InquiryStatusT, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  WITHDRAWN: "bg-zinc-100 text-zinc-500 border-zinc-200"
};

export default async function MyInquiriesPage() {
  await requireOnboardedUser();
  const inquiries = await apiGet("/me/inquiries", InquiriesSchema);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-zinc-900">Meine Anfragen</div>
        <div className="mt-1 text-sm text-zinc-500">
          Anfragen, die du an Verkäufer gestellt hast. Bei Annahme wird die vollständige
          Adresse + Verkäufer-Kontakt freigegeben.
        </div>
      </div>

      <Card title={`Anfragen (${inquiries.length})`}>
        {inquiries.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Noch keine Anfragen gestellt. Stelle eine über{" "}
            <Link href="/marketplace" className="text-indigo-600 hover:text-indigo-700 underline">/marketplace</Link>.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {inquiries.map((inq) => {
              const cover = inq.listing.images?.[0]?.url;
              return (
                <div key={inq.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-start">
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cover}
                      alt={inq.listing.images[0].alt ?? ""}
                      className="aspect-video w-full rounded-lg border border-zinc-200 object-cover md:w-44"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-xs text-zinc-400 md:w-44">
                      Kein Bild
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/inquiries/${inq.id}`}
                        className="text-sm font-semibold text-zinc-900 hover:text-indigo-700 hover:underline"
                      >
                        {inq.listing.title}
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[inq.status]}`}
                      >
                        {INQUIRY_STATUS_LABELS[inq.status]}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {ASSET_TYPE_LABELS[inq.listing.propertyType]} • {inq.listing.city}
                      {inq.listing.district ? `, ${inq.listing.district}` : ""} • {eur(inq.listing.askingPrice)}
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs text-zinc-600">
                      „{inq.message}"
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-400">
                      Gestellt am {new Date(inq.createdAt).toLocaleDateString("de-DE")}
                      {inq.respondedAt
                        ? ` • Beantwortet am ${new Date(inq.respondedAt).toLocaleDateString("de-DE")}`
                        : ""}
                    </div>
                  </div>
                  <Link
                    href={`/inquiries/${inq.id}`}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                  >
                    Details
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
