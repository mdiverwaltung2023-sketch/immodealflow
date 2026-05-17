import Link from "next/link";
import { z } from "zod";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import {
  OffmarketLeadSchema,
  OFFMARKET_LEAD_STATUS_LABELS,
  ASSET_TYPE_LABELS
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MyOffmarketLeadsPage() {
  await requireOnboardedUser();
  const leads = await apiGet("/me/offmarket-leads", z.array(OffmarketLeadSchema));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Offmarket
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            Meine Offmarket-Inserate
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Diskrete Inserate. Nur eingeladene Investoren sehen sie — und auch
            das erst nach Doppel-Freigabe.
          </p>
        </div>
        <Link
          href="/offmarket/leads/neu"
          className="rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-amber-700"
        >
          + Offmarket-Inserat anlegen
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <div className="text-sm text-zinc-500">
            Noch kein Offmarket-Inserat angelegt.
          </div>
          <Link
            href="/offmarket/leads/neu"
            className="mt-3 inline-block text-sm font-semibold text-amber-700 underline"
          >
            Jetzt anlegen →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {leads.map((l) => (
            <Link
              key={l.id}
              href={`/offmarket/leads/${l.id}`}
              className="block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-zinc-900">
                  {l.title}
                </h3>
                <StatusBadge status={l.status} />
              </div>
              <div className="mt-1.5 text-xs text-zinc-500">
                {ASSET_TYPE_LABELS[l.propertyType]} · {l.city} · {l.approxArea} m²
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-semibold text-amber-700">
                  {Math.round(l.approxPrice / 1000).toLocaleString("de-DE")} k €
                </span>
                {l.approxRent && (
                  <span className="text-xs text-zinc-500">
                    · {l.approxRent.toLocaleString("de-DE")} € Miete/Mon.
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <span>📨 {l._count?.invites ?? 0} Einladungen versendet</span>
              </div>
              {l.highlights.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {l.highlights.slice(0, 4).map((h) => (
                    <span
                      key={h}
                      className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: keyof typeof OFFMARKET_LEAD_STATUS_LABELS }) {
  const color: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700",
    ACTIVE: "bg-emerald-100 text-emerald-800",
    PAUSED: "bg-amber-100 text-amber-800",
    CLOSED: "bg-zinc-100 text-zinc-500"
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${color[status]}`}
    >
      {OFFMARKET_LEAD_STATUS_LABELS[status]}
    </span>
  );
}
