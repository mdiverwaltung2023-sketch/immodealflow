import Link from "next/link";
import {
  ASSET_TYPE_LABELS,
  INQUIRY_STATUS_LABELS,
  MyInquirySchema
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card, Stat } from "@/components/ui";
import { WithdrawButton } from "./WithdrawButton";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function InquiryDetailPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const inq = await apiGet(`/me/inquiries/${params.id}`, MyInquirySchema);

  const accepted = inq.status === "ACCEPTED";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold">Meine Anfrage</div>
          <div className="mt-1 text-sm text-zinc-400">
            Status: {INQUIRY_STATUS_LABELS[inq.status]} • Gestellt am{" "}
            {new Date(inq.createdAt).toLocaleString("de-DE")}
          </div>
        </div>
        <Link href="/inquiries" className="text-sm text-zinc-300 hover:underline">
          ← Zur Liste
        </Link>
      </div>

      <Card title="Listing">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-2">
            <div className="text-sm font-semibold text-white">{inq.listing.title}</div>
            <div className="text-xs text-zinc-400">
              {ASSET_TYPE_LABELS[inq.listing.propertyType]} • {inq.listing.city}
              {inq.listing.district ? `, ${inq.listing.district}` : ""}
              {inq.listing.postalCode ? `, ${inq.listing.postalCode}` : ""}
            </div>
            {accepted && inq.listing.fullAddress ? (
              <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-100">
                <div className="text-xs uppercase tracking-wide text-emerald-300">
                  Vollständige Adresse (freigegeben durch Verkäufer)
                </div>
                <div className="mt-1 font-semibold">{inq.listing.fullAddress}</div>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3">
            <Stat label="Angebotspreis" value={eur(inq.listing.askingPrice)} />
            <Stat label="Fläche" value={`${inq.listing.totalArea} m²`} />
            {inq.listing.totalRent ? (
              <Stat label="Sollmiete" value={`${eur(inq.listing.totalRent)}/Mon.`} />
            ) : null}
          </div>
        </div>
      </Card>

      <Card title="Deine Nachricht">
        <div className="whitespace-pre-wrap text-sm text-zinc-200">{inq.message}</div>
      </Card>

      {inq.response || inq.respondedAt ? (
        <Card title="Antwort des Verkäufers">
          <div className="space-y-2">
            <div className="text-xs text-zinc-400">
              {inq.respondedAt
                ? new Date(inq.respondedAt).toLocaleString("de-DE")
                : ""}
              {" • "}
              {INQUIRY_STATUS_LABELS[inq.status]}
            </div>
            {inq.response ? (
              <div className="whitespace-pre-wrap text-sm text-zinc-200">{inq.response}</div>
            ) : (
              <div className="text-sm text-zinc-400">Keine begleitende Nachricht.</div>
            )}
          </div>
        </Card>
      ) : null}

      <Card title="Verkäufer-Kontakt">
        {accepted ? (
          <div className="grid gap-3">
            <Stat label="Name" value={inq.seller.name ?? "—"} />
            <Stat label="E-Mail" value={inq.seller.email ?? "—"} />
            <div className="text-xs text-zinc-500">
              Kontaktdaten freigegeben nach Annahme der Anfrage.
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-400">
            Verkäufer-Kontaktdaten werden erst nach Annahme der Anfrage freigegeben.
          </div>
        )}
      </Card>

      {inq.status === "PENDING" ? (
        <Card title="Aktion">
          <WithdrawButton inquiryId={inq.id} />
        </Card>
      ) : null}
    </div>
  );
}
