import Link from "next/link";
import { z } from "zod";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { FinancingOverviewSchema, FinancingRequestSchema, type Light } from "@/lib/api";
import { FinancingRequestsSection } from "./FinancingRequestsSection";

export const dynamic = "force-dynamic";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

const DOT: Record<Light, string> = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-amber-400",
  RED: "bg-rose-500"
};
const PILL: Record<Light, string> = {
  GREEN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  YELLOW: "bg-amber-50 text-amber-800 border-amber-200",
  RED: "bg-rose-50 text-rose-700 border-rose-200"
};

export default async function FinanzierungPage() {
  await requireOnboardedUser();
  const data = await apiGet("/me/financing/overview", FinancingOverviewSchema);
  const requests = await apiGet("/me/financing-requests", z.array(FinancingRequestSchema));

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
              Oikos Capital Layer
            </div>
            <h1 className="mt-1 text-2xl font-semibold">Finanzierung</h1>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50">
              Mach deine Deals bankfähig. Für jedes Objekt zeigt die
              Bankfähigkeits-Ampel auf einen Blick, wo du stehst — Eigenkapital,
              Kapitaldienstdeckung, Bonität und Beleihungsauslauf — und welche
              Schritte zur Finanzierung noch fehlen.
            </p>
          </div>
          <div className="flex gap-3">
            {(
              [
                ["GREEN", data.counts.green, "Bankfähig"],
                ["YELLOW", data.counts.yellow, "Optimieren"],
                ["RED", data.counts.red, "Kritisch"]
              ] as [Light, number, string][]
            ).map(([light, n, label]) => (
              <div
                key={light}
                className="min-w-[78px] rounded-xl bg-white/10 px-3 py-2 text-center backdrop-blur"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[light]}`} />
                  <span className="text-lg font-semibold">{n}</span>
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-emerald-100">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!data.hasProfile ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          Für eine belastbare Bewertung fehlt dein Investor-Profil (Eigenkapital,
          Einkommen, Bonität).{" "}
          <Link href="/profile" className="font-medium underline">
            Profil vervollständigen →
          </Link>
        </div>
      ) : null}

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="text-sm font-medium text-zinc-900">
            Noch keine Objekte zur Finanzierung
          </div>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            Beobachte ein Objekt, dann berechnet der Capital Layer automatisch
            seine Bankfähigkeit.
          </p>
          <Link
            href="/new"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Objekt beobachten
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-900">
            Finanzierbarkeit meiner Objekte ({data.items.length})
          </div>
          <ul className="divide-y divide-zinc-100">
            {data.items.map((it) => (
              <li key={it.id}>
                <Link
                  href={`/property/${it.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {it.title}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {it.location} • {eur(it.price)} • {eur(it.rent)}/Mon.
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {it.evaluated && it.overall ? (
                      <>
                        <span className="text-xs font-medium text-zinc-500">
                          Score {it.readinessScore}/100
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${PILL[it.overall]}`}
                        >
                          <span className={`inline-block h-2 w-2 rounded-full ${DOT[it.overall]}`} />
                          {it.overallLabel}
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-500">
                        Miete ergänzen
                      </span>
                    )}
                    <span className="text-zinc-300">→</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FinancingRequestsSection initial={requests} />

      <p className="text-[11px] leading-relaxed text-zinc-400">
        Selbsteinschätzung der allgemeinen Bankfähigkeit aus euren Daten — keine
        Finanzierungsberatung und keine Empfehlung eines konkreten
        Kreditprodukts. Die konkrete Prüfung erfolgt durch einen
        Finanzierungspartner.
      </p>
    </div>
  );
}
