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
  PENDING: "bg-amber-950/40 text-amber-200 border-amber-900",
  ACCEPTED: "bg-emerald-950/40 text-emerald-200 border-emerald-900",
  REJECTED: "bg-rose-950/40 text-rose-200 border-rose-900",
  WITHDRAWN: "bg-zinc-900/40 text-zinc-500 border-zinc-800"
};

export default async function MyInquiriesPage() {
  await requireOnboardedUser();
  const inquiries = await apiGet("/me/inquiries", InquiriesSchema);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Meine Anfragen</div>
        <div className="mt-1 text-sm text-zinc-400">
          Anfragen, die du an Verkäufer gestellt hast. Bei Annahme wird die vollständige
          Adresse + Verkäufer-Kontakt freigegeben.
        </div>
      </div>

      <Card title={`Anfragen (${inquiries.length})`}>
        {inquiries.length === 0 ? (
          <div className="text-sm text-zinc-400">
            Noch keine Anfragen gestellt. Stelle eine über{" "}
            <Link href="/marketplace" className="underline">/marketplace</Link>.
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {inquiries.map((inq) => {
              const cover = inq.listing.images?.[0]?.url;
              return (
                <div key={inq.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-start">
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cover}
                      alt={inq.listing.images[0].alt ?? ""}
                      className="aspect-video w-full rounded-lg border border-zinc-800 object-cover md:w-44"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-600 md:w-44">
                      Kein Bild
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/inquiries/${inq.id}`}
                        className="text-sm font-semibold text-white hover:underline"
                      >
                        {inq.listing.title}
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[inq.status]}`}
                      >
                        {INQUIRY_STATUS_LABELS[inq.status]}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {ASSET_TYPE_LABELS[inq.listing.propertyType]} • {inq.listing.city}
                      {inq.listing.district ? `, ${inq.listing.district}` : ""} • {eur(inq.listing.askingPrice)}
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs text-zinc-300">
                      „{inq.message}"
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      Gestellt am {new Date(inq.createdAt).toLocaleDateString("de-DE")}
                      {inq.respondedAt
                        ? ` • Beantwortet am ${new Date(inq.respondedAt).toLocaleDateString("de-DE")}`
                        : ""}
                    </div>
                  </div>
                  <Link
                    href={`/inquiries/${inq.id}`}
                    className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
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
