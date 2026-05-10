import Link from "next/link";
import { z } from "zod";
import {
  RentalUnitSchema,
  RentalApplicationListItemSchema,
  RENTAL_STATUS_LABELS,
  type ApplicantRatingT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { RentalUnitForm } from "@/components/RentalUnitForm";
import { ApplicationsSection } from "./ApplicationsSection";

export const dynamic = "force-dynamic";

const ApplicationsSchema = z.array(RentalApplicationListItemSchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function RentalDetailPage({
  params
}: {
  params: { id: string };
}) {
  await requireOnboardedUser();

  const [unit, applications] = await Promise.all([
    apiGet(`/me/rental-units/${params.id}`, RentalUnitSchema),
    apiGet(
      `/me/rental-units/${params.id}/applications`,
      ApplicationsSchema
    ).catch(() => [])
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/rentals"
            className="text-xs text-zinc-500 hover:text-indigo-700 hover:underline"
          >
            ← Vermietung
          </Link>
          <div className="mt-1 text-2xl font-semibold text-zinc-900 truncate">
            {unit.title}
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            {unit.city}
            {unit.district ? ` · ${unit.district}` : ""} · {unit.rooms} Zi · {unit.livingArea} m²
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Status</div>
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
            {RENTAL_STATUS_LABELS[unit.status]}
          </div>
        </div>
      </div>

      <DiscriminationDisclaimer />

      <Card title="Eckdaten">
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <Stat label="Kaltmiete" value={eur(unit.rentCold)} />
          <Stat label="Nebenkosten" value={unit.utilities ? eur(unit.utilities) : "—"} />
          <Stat label="Warmmiete" value={unit.totalRent ? eur(unit.totalRent) : "—"} />
          <Stat label="Kaution" value={unit.deposit ? eur(unit.deposit) : "—"} />
          <Stat label="Wohnfläche" value={`${unit.livingArea} m²`} />
          <Stat label="Etage" value={unit.floor ?? "—"} />
        </div>
        {unit.description ? (
          <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 whitespace-pre-wrap">
            {unit.description}
          </div>
        ) : null}
      </Card>

      {unit.images.length > 0 ? (
        <Card title={`Bilder (${unit.images.length})`}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {unit.images.map((img) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={img.id}
                src={img.url}
                alt={img.alt ?? unit.title}
                className="aspect-[4/3] w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </Card>
      ) : null}

      <ApplicationsSection
        unitId={unit.id}
        initialApplications={applications.map((a) => ({
          id: a.id,
          createdAt: a.createdAt,
          applicantName: a.applicantName,
          status: a.status,
          monthlyNetIncome: a.monthlyNetIncome ?? null,
          householdSize: a.householdSize ?? null,
          desiredMoveInDate: a.desiredMoveInDate ?? null,
          latestEvalRating:
            a.evaluations[0]?.rating as ApplicantRatingT | undefined,
          latestEvalRecommendViewing: a.evaluations[0]?.recommendViewing ?? null,
          latestEvalSummary: a.evaluations[0]?.summary ?? null
        }))}
      />

      <Card title="Inserat bearbeiten">
        <RentalUnitForm initial={unit} mode="edit" />
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function DiscriminationDisclaimer() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
      <span className="font-semibold">Hinweis Anti-Diskriminierung (AGG):</span>{" "}
      Die KI-Bewertung berücksichtigt ausschließlich wirtschaftliche und organisatorische
      Faktoren. Sensible Merkmale (Herkunft, Religion, Geschlecht, sexuelle Orientierung,
      Alter, Behinderung, Familienstand) werden weder erfasst noch bewertet — und die KI
      ist angewiesen, sie auch nicht aus Namen oder Notizen abzuleiten. Die Einschätzung
      ersetzt keine persönliche Entscheidung des Vermieters.
    </div>
  );
}
