import Link from "next/link";
import {
  RentalMarketplaceDetailSchema,
  APPLICATION_STATUS_LABELS
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { ApplyModal } from "./ApplyModal";
import { Gallery } from "./Gallery";

export const dynamic = "force-dynamic";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

export default async function RentalMarketplaceDetailPage({
  params
}: {
  params: { id: string };
}) {
  const me = await requireOnboardedUser();
  const unit = await apiGet(
    `/rental-marketplace/${params.id}`,
    RentalMarketplaceDetailSchema
  );

  const isOwner = me.id === unit.ownerId;
  const alreadyApplied = !!unit.myApplication;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/rental-marketplace"
          className="text-xs text-zinc-500 hover:text-indigo-700 hover:underline"
        >
          ← Mietbörse
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl font-semibold text-zinc-900">{unit.title}</div>
            <div className="mt-1 text-sm text-zinc-500">
              {unit.city}
              {unit.district ? ` · ${unit.district}` : ""} · {unit.rooms} Zi ·{" "}
              {unit.livingArea} m²
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums text-zinc-900">
              {eur(unit.rentCold)}
            </div>
            <div className="text-[11px] text-zinc-500">kalt/Monat</div>
          </div>
        </div>
      </div>

      <Gallery images={unit.images} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Eckdaten">
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <Stat label="Kaltmiete" value={eur(unit.rentCold)} />
              <Stat
                label="Nebenkosten"
                value={unit.utilities ? eur(unit.utilities) : "—"}
              />
              <Stat
                label="Warmmiete"
                value={unit.totalRent ? eur(unit.totalRent) : "—"}
              />
              <Stat label="Kaution" value={unit.deposit ? eur(unit.deposit) : "—"} />
              <Stat label="Wohnfläche" value={`${unit.livingArea} m²`} />
              <Stat label="Zimmer" value={unit.rooms} />
              <Stat label="Etage" value={unit.floor ?? "—"} />
              <Stat
                label="Bäder"
                value={unit.bathrooms ? String(unit.bathrooms) : "—"}
              />
              <Stat
                label="Verfügbar ab"
                value={
                  unit.availableFrom
                    ? new Date(unit.availableFrom).toLocaleDateString("de-DE")
                    : "sofort"
                }
              />
            </div>
            {unit.description ? (
              <div className="mt-4 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
                {unit.description}
              </div>
            ) : null}
          </Card>

          <Card title="Ausstattung">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <FeatureRow label="Balkon" value={unit.balcony} extra={unit.balconyArea ? `${unit.balconyArea} m²` : null} />
              <FeatureRow label="Terrasse" value={unit.terrace} extra={unit.terraceArea ? `${unit.terraceArea} m²` : null} />
              <FeatureRow label="Garten" value={unit.garden} extra={unit.gardenShared ? "geteilt" : null} />
              <FeatureRow label="Keller" value={unit.cellar} />
              <FeatureRow label="Dachboden" value={unit.attic} />
              <FeatureRow label="Aufzug" value={unit.elevator} />
              <FeatureRow label="Barrierefrei" value={unit.barrierFree} />
              <FeatureRow label="Möbliert" value={unit.furnished} extra={unit.partlyFurnished ? "teilweise" : null} />
              <FeatureRow
                label="Einbauküche"
                value={unit.kitchenIncluded}
                extra={unit.kitchenBuyOut ? `Abstand: ${eur(unit.kitchenBuyOut)}` : null}
              />
              <FeatureRow label="Gäste-WC" value={unit.separateGuestWc} />
              <FeatureRow
                label="Stellplatz"
                value={!!unit.parkingType}
                extra={
                  unit.parkingType
                    ? `${unit.parkingType}${unit.parkingCost ? ` · ${eur(unit.parkingCost)}/Mon` : ""}`
                    : null
                }
              />
              <FeatureRow
                label="Haustiere"
                value={unit.petsAllowed ?? false}
                extra={unit.petsNote}
              />
              <FeatureRow
                label="Internet"
                value={unit.internetAvailable ?? false}
                extra={unit.internetSpeed}
              />
            </div>
          </Card>

          {(unit.yearBuilt ||
            unit.lastRenovation ||
            unit.totalUnits ||
            unit.energyClass ||
            unit.energyConsumption ||
            unit.heatingType) && (
            <Card title="Gebäude & Energie">
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                {unit.yearBuilt ? (
                  <Stat label="Baujahr" value={unit.yearBuilt} />
                ) : null}
                {unit.lastRenovation ? (
                  <Stat label="Letzte Sanierung" value={unit.lastRenovation} />
                ) : null}
                {unit.totalUnits ? (
                  <Stat label="Einheiten im Haus" value={unit.totalUnits} />
                ) : null}
                {unit.energyClass ? (
                  <Stat label="Energieklasse" value={unit.energyClass} />
                ) : null}
                {unit.energyConsumption ? (
                  <Stat
                    label="Energiekennwert"
                    value={`${unit.energyConsumption} kWh/m²a`}
                  />
                ) : null}
                {unit.energyCarrier ? (
                  <Stat label="Energieträger" value={unit.energyCarrier} />
                ) : null}
                {unit.heatingType ? (
                  <Stat label="Heizung" value={unit.heatingType} />
                ) : null}
              </div>
            </Card>
          )}

          {(unit.minRentDurationMonths ||
            unit.depositMonths ||
            unit.fixedTerm ||
            unit.conditions) && (
            <Card title="Konditionen">
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                {unit.minRentDurationMonths ? (
                  <Stat
                    label="Mindestmietdauer"
                    value={`${unit.minRentDurationMonths} Monate`}
                  />
                ) : null}
                {unit.depositMonths ? (
                  <Stat label="Kaution" value={`${unit.depositMonths} Kaltmieten`} />
                ) : null}
                {unit.fixedTerm ? (
                  <Stat
                    label="Befristet"
                    value={
                      unit.fixedTermMonths ? `${unit.fixedTermMonths} Monate` : "ja"
                    }
                  />
                ) : null}
              </div>
              {unit.conditions ? (
                <div className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
                  {unit.conditions}
                </div>
              ) : null}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Anbieter">
            <div className="text-sm">
              <div className="text-zinc-500 text-xs">Vermieter</div>
              <div className="mt-1 font-semibold text-zinc-900">
                {unit.owner.name ?? "Privater Anbieter"}
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
              <strong className="font-semibold">Adresse anonymisiert.</strong> Die
              vollständige Adresse wird erst geteilt, wenn der Vermieter deine
              Bewerbung freigibt.
            </div>
          </Card>

          {isOwner ? (
            <Card title="Dein eigenes Inserat">
              <p className="text-xs text-zinc-600">
                Das ist eines deiner Mietobjekte. Eine Selbst-Bewerbung ist nicht
                möglich.
              </p>
              <Link
                href={`/rentals/${unit.id}`}
                className="mt-3 inline-block rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Inserat verwalten →
              </Link>
            </Card>
          ) : alreadyApplied ? (
            <Card title="Bewerbung läuft">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <div className="font-semibold">Du hast dich bereits beworben.</div>
                <div className="mt-1 text-xs">
                  Status:{" "}
                  <span className="font-semibold">
                    {APPLICATION_STATUS_LABELS[unit.myApplication!.status]}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-800/70">
                  Eingereicht am{" "}
                  {new Date(unit.myApplication!.createdAt).toLocaleDateString("de-DE")}
                </div>
              </div>
              <Link
                href="/me/applications-sent"
                className="mt-3 inline-block text-xs font-medium text-indigo-700 hover:text-indigo-800"
              >
                Alle eigenen Bewerbungen ansehen →
              </Link>
            </Card>
          ) : (
            <Card title="Bewerben">
              <p className="text-xs text-zinc-600">
                Reiche jetzt deine Bewerbung ein. Du brauchst kein Anschreiben — wir
                fragen nur die organisatorischen &amp; wirtschaftlichen Eckdaten ab.
              </p>
              <ApplyModal
                unitId={unit.id}
                unitTitle={unit.title}
                defaultName={me.name ?? ""}
                defaultEmail={me.email ?? ""}
              />
              <p className="mt-3 text-[10px] leading-snug text-zinc-500">
                Es werden keine Angaben zu Herkunft, Religion, Familienstand,
                Geschlecht oder ähnlichen sensiblen Merkmalen erhoben (AGG).
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  label,
  value,
  extra
}: {
  label: string;
  value: boolean;
  extra?: string | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-100 bg-white px-2 py-1.5">
      <span className="text-zinc-600">{label}</span>
      <span
        className={
          value ? "font-semibold text-emerald-700" : "text-zinc-400"
        }
      >
        {value ? extra ?? "ja" : "—"}
      </span>
    </div>
  );
}
