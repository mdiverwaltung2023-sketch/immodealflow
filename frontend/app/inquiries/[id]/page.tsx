import Link from "next/link";
import {
  ASSET_TYPE_LABELS,
  INQUIRY_STATUS_LABELS,
  InquiryDetailWithRatingsSchema,
  LISTING_STATUS_LABELS
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card, Stat } from "@/components/ui";
import { StarSummary } from "@/components/StarRating";
import { RatingForm } from "@/components/RatingForm";
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
  const inq = await apiGet(`/me/inquiries/${params.id}`, InquiryDetailWithRatingsSchema);

  const accepted = inq.status === "ACCEPTED";
  const sold = inq.listing.status === "SOLD";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold text-zinc-900">Meine Anfrage</div>
          <div className="mt-1 text-sm text-zinc-500">
            Status: {INQUIRY_STATUS_LABELS[inq.status]} • Gestellt am{" "}
            {new Date(inq.createdAt).toLocaleString("de-DE")}
          </div>
        </div>
        <Link href="/inquiries" className="text-sm text-zinc-600 hover:text-indigo-700 hover:underline">
          ← Zur Liste
        </Link>
      </div>

      <Card title="Listing">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-2">
            <div className="text-sm font-semibold text-zinc-900">{inq.listing.title}</div>
            <div className="text-xs text-zinc-500">
              {ASSET_TYPE_LABELS[inq.listing.propertyType]} • {inq.listing.city}
              {inq.listing.district ? `, ${inq.listing.district}` : ""}
              {inq.listing.postalCode ? `, ${inq.listing.postalCode}` : ""}
            </div>
            {accepted && inq.listing.fullAddress ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <div className="text-xs uppercase tracking-wide text-emerald-700">
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
        <div className="whitespace-pre-wrap text-sm text-zinc-700">{inq.message}</div>
      </Card>

      {inq.response || inq.respondedAt ? (
        <Card title="Antwort des Verkäufers">
          <div className="space-y-2">
            <div className="text-xs text-zinc-500">
              {inq.respondedAt
                ? new Date(inq.respondedAt).toLocaleString("de-DE")
                : ""}
              {" • "}
              {INQUIRY_STATUS_LABELS[inq.status]}
            </div>
            {inq.response ? (
              <div className="whitespace-pre-wrap text-sm text-zinc-700">{inq.response}</div>
            ) : (
              <div className="text-sm text-zinc-500">Keine begleitende Nachricht.</div>
            )}
          </div>
        </Card>
      ) : null}

      <Card title="Verkäufer-Kontakt">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-zinc-500">Bewertung des Verkäufers:</span>
            <StarSummary summary={inq.sellerSummary} size="md" />
          </div>
          {accepted ? (
            <div className="grid gap-3">
              <Stat label="Name" value={inq.seller.name ?? "—"} />
              <Stat label="E-Mail" value={inq.seller.email ?? "—"} />
              <div className="text-xs text-zinc-500">
                Kontaktdaten freigegeben nach Annahme der Anfrage.
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">
              Verkäufer-Kontaktdaten werden erst nach Annahme der Anfrage freigegeben.
            </div>
          )}
        </div>
      </Card>

      {inq.status === "PENDING" ? (
        <Card title="Aktion">
          <WithdrawButton inquiryId={inq.id} />
        </Card>
      ) : null}

      {/* Bewertung — nur nach SOLD + ACCEPTED möglich */}
      {accepted && sold ? (
        inq.canRate ? (
          <RatingForm inquiryId={inq.id} audience="seller" />
        ) : inq.myRating ? (
          <Card title="Deine Bewertung">
            <div className="space-y-2">
              <div className="text-amber-500 text-lg">
                {"★".repeat(inq.myRating.stars)}
                <span className="text-zinc-300">{"★".repeat(5 - inq.myRating.stars)}</span>
                <span className="ml-2 text-sm text-zinc-600">{inq.myRating.stars}/5</span>
              </div>
              <div className="whitespace-pre-wrap text-sm text-zinc-700">{inq.myRating.body}</div>
              <div className="text-[10px] text-zinc-500">
                Abgegeben am {new Date(inq.myRating.createdAt).toLocaleString("de-DE")}
              </div>
            </div>
          </Card>
        ) : null
      ) : accepted ? (
        <Card title="Bewertung">
          <div className="text-sm text-zinc-500">
            Eine Bewertung kannst du abgeben, sobald der Verkäufer das Listing auf{" "}
            <span className="font-semibold text-zinc-900">{LISTING_STATUS_LABELS["SOLD"]}</span>{" "}
            gesetzt hat.
          </div>
        </Card>
      ) : null}

      {/* Bewertung des Verkäufers über mich (Investor) */}
      {inq.sellerRating ? (
        <Card title="Bewertung des Verkäufers über dich">
          <div className="space-y-2">
            <div className="text-amber-500 text-lg">
              {"★".repeat(inq.sellerRating.stars)}
              <span className="text-zinc-300">{"★".repeat(5 - inq.sellerRating.stars)}</span>
              <span className="ml-2 text-sm text-zinc-600">{inq.sellerRating.stars}/5</span>
            </div>
            <div className="whitespace-pre-wrap text-sm text-zinc-700">{inq.sellerRating.body}</div>
            {inq.sellerRating.rebuttal ? (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  Deine Gegendarstellung
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                  {inq.sellerRating.rebuttal}
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
