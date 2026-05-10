import Link from "next/link";
import {
  RentalApplicationDetailSchema,
  APPLICATION_STATUS_LABELS,
  APPLICANT_RATING_LABELS
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";
import { ApplicantEvaluationCard } from "./ApplicantEvaluationCard";
import { ApplicationStatusForm } from "./ApplicationStatusForm";

export const dynamic = "force-dynamic";

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function ApplicationDetailPage({
  params
}: {
  params: { id: string; appId: string };
}) {
  await requireOnboardedUser();
  const app = await apiGet(
    `/me/rental-applications/${params.appId}`,
    RentalApplicationDetailSchema
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/rentals/${params.id}`}
            className="text-xs text-zinc-500 hover:text-indigo-700 hover:underline"
          >
            ← {app.unit.title}
          </Link>
          <div className="mt-1 text-2xl font-semibold text-zinc-900 truncate">
            {app.applicantName}
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Bewerbung vom {new Date(app.createdAt).toLocaleDateString("de-DE")}
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Bewerbungs-Status
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
            {APPLICATION_STATUS_LABELS[app.status]}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <span className="font-semibold">Anti-Diskriminierung:</span> Die KI berücksichtigt
        nur wirtschaftliche und organisatorische Faktoren. Sensible Merkmale werden weder
        erfasst noch bewertet. Die Einschätzung ersetzt keine persönliche Entscheidung.
      </div>

      <Card title="Bewerber-Daten">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-sm">
          <Stat label="Name" value={app.applicantName} />
          <Stat label="E-Mail" value={app.email ?? "—"} />
          <Stat label="Telefon" value={app.phone ?? "—"} />
          <Stat label="Haushaltsnetto" value={eur(app.monthlyNetIncome)} />
          <Stat label="Beschäftigung" value={app.employmentType ?? "—"} />
          <Stat label="Beschäftigungsdauer" value={app.employmentDuration ?? "—"} />
          <Stat label="SCHUFA" value={app.schufaScore ?? "—"} />
          <Stat
            label="Haushalt"
            value={app.householdSize ? `${app.householdSize} Personen` : "—"}
          />
          <Stat
            label="Haustiere"
            value={app.hasPets ? app.petDetails ?? "ja" : "nein"}
          />
          <Stat label="Raucher" value={app.smoker ? "ja" : "nein"} />
          <Stat
            label="Wunsch-Einzug"
            value={
              app.desiredMoveInDate
                ? new Date(app.desiredMoveInDate).toLocaleDateString("de-DE")
                : "—"
            }
          />
          <Stat label="Geplante Mietdauer" value={app.intendedDuration ?? "—"} />
        </div>
        {app.notes ? (
          <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 whitespace-pre-wrap">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Notizen
            </div>
            <div className="mt-1">{app.notes}</div>
          </div>
        ) : null}
      </Card>

      <ApplicationStatusForm
        applicationId={app.id}
        currentStatus={app.status}
      />

      <ApplicantEvaluationCard
        applicationId={app.id}
        initialEvaluations={app.evaluations}
      />

      {app.evaluations.length > 1 ? (
        <Card title={`Verlauf (${app.evaluations.length} Bewertungen)`}>
          <ul className="divide-y divide-zinc-200">
            {app.evaluations.slice(1).map((ev) => (
              <li key={ev.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-700">
                    {APPLICANT_RATING_LABELS[ev.rating]}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(ev.createdAt).toLocaleString("de-DE")}
                  </span>
                </div>
                {ev.summary ? (
                  <div className="mt-0.5 text-xs text-zinc-500 italic line-clamp-2">
                    {ev.summary}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-900 truncate">{value}</div>
    </div>
  );
}
