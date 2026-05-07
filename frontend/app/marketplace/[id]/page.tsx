import Link from "next/link";
import {
  ASSET_TYPE_LABELS,
  ANONYMIZATION_LABELS,
  MarketplaceListingDetailSchema
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card, Stat } from "@/components/ui";
import { InquiryActions } from "./InquiryActions";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function MarketplaceDetailPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const l = await apiGet(`/marketplace/${params.id}`, MarketplaceListingDetailSchema);

  const yieldGross = l.totalRent ? ((l.totalRent * 12) / l.askingPrice) * 100 : null;
  const pricePerSqm = l.totalArea > 0 ? l.askingPrice / l.totalArea : null;
  const locationParts = [l.city, l.district, l.postalCode].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-semibold">{l.title}</div>
          <div className="mt-1 text-sm text-zinc-400">
            {ASSET_TYPE_LABELS[l.propertyType]} • {locationParts.join(", ")}
          </div>
        </div>
        <Link href="/marketplace" className="text-sm text-zinc-300 hover:underline">
          ← Zurück
        </Link>
      </div>

      {l.images.length > 0 ? (
        <Card title="Bilder">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {l.images.map((img) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={img.id}
                src={img.url}
                alt={img.alt ?? ""}
                className="aspect-video w-full rounded-lg border border-zinc-800 object-cover"
              />
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Eckdaten">
          <div className="grid gap-3">
            <Stat label="Angebotspreis" value={eur(l.askingPrice)} />
            <Stat label="Gesamtfläche" value={`${l.totalArea} m²`} />
            {l.totalRent ? (
              <Stat label="Sollmiete" value={`${eur(l.totalRent)}/Mon.`} />
            ) : null}
            {pricePerSqm != null ? (
              <Stat label="Preis pro m²" value={eur(Math.round(pricePerSqm))} />
            ) : null}
            {yieldGross != null ? (
              <Stat label="Bruttorendite" value={`${yieldGross.toFixed(2)} %`} />
            ) : null}
          </div>
        </Card>

        <Card title="Lage">
          <div className="grid gap-3">
            <Stat label="Stadt" value={l.city} />
            {l.district ? <Stat label="Stadtteil" value={l.district} /> : null}
            {l.postalCode ? <Stat label="PLZ" value={l.postalCode} /> : null}
            {l.fullAddress ? <Stat label="Adresse" value={l.fullAddress} /> : (
              <div className="text-xs text-zinc-500">
                Vollständige Adresse erst nach Anfrage-Annahme (Phase D).
                Aktuelle Anonymisierung: {ANONYMIZATION_LABELS[l.anonymizationLevel]}.
              </div>
            )}
          </div>
        </Card>

        <Card title="Verkäufer">
          <div className="grid gap-3">
            <Stat label="Name" value={l.owner.name ?? "Anonym"} />
            <Stat label="Rolle" value={l.owner.role === "INVESTOR" ? "Investor" : l.owner.role === "SELLER" ? "Verkäufer" : "Beides"} />
            <div className="text-xs text-zinc-500">
              Direkter Anfrage-Flow folgt mit Phase D.
            </div>
          </div>
        </Card>
      </div>

      {l.description.trim() ? (
        <Card title="Beschreibung">
          <div className="whitespace-pre-wrap text-sm text-zinc-200">{l.description}</div>
        </Card>
      ) : null}

      <Card title="Anfrage an den Verkäufer">
        <InquiryActions
          listingId={l.id}
          isOwner={l.isOwner}
          listingStatus={l.status}
          myInquiry={l.myInquiry ?? null}
        />
      </Card>
    </div>
  );
}
