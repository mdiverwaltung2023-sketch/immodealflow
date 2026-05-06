import Link from "next/link";
import { z } from "zod";
import { PropertyListItemSchema, STATUS_ORDER, STATUS_LABELS, DealStatusEnum, type DealStatus } from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card, StatusBadge } from "@/components/ui";
import { PropertyActions } from "./PropertyActions";
import { ClaimLegacyBanner } from "./ClaimLegacyBanner";

const PropertiesSchema = z.array(PropertyListItemSchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

type Search = { status?: string };

export default async function DashboardPage({ searchParams }: { searchParams?: Search }) {
  // Guard zuerst — redirected ggf. auf /onboarding und liefert User mit
  const me = await requireOnboardedUser();

  const statusFilter = (() => {
    const raw = searchParams?.status;
    const parsed = raw ? DealStatusEnum.safeParse(raw) : null;
    return parsed?.success ? parsed.data : null;
  })();

  const path = statusFilter ? `/properties?status=${statusFilter}` : "/properties";
  const properties = await apiGet(path, PropertiesSchema);

  // Counts (zweiter Call ohne Filter, damit die Tabs immer Anzahl zeigen — oder von properties wenn kein Filter)
  const all = statusFilter ? await apiGet("/properties", PropertiesSchema) : properties;

  const counts: Record<DealStatus | "ALL", number> = {
    ALL: all.length,
    WATCHING: 0,
    INQUIRED: 0,
    NEGOTIATING: 0,
    LOI: 0,
    NOTAR: 0,
    CLOSED: 0,
    REJECTED: 0
  };
  all.forEach((p) => {
    counts[p.status]++;
  });

  return (
    <div className="space-y-6">
      <ClaimLegacyBanner count={me.legacyCount ?? 0} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Dashboard</div>
          <div className="mt-1 text-sm text-zinc-400">
            Properties anlegen, analysieren und Angebot generieren.
          </div>
        </div>
        <Link
          href="/new"
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
        >
          Neues Objekt
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterTab href="/dashboard" active={!statusFilter} label="Alle" count={counts.ALL} />
        {STATUS_ORDER.map((s) => (
          <FilterTab
            key={s}
            href={`/dashboard?status=${s}`}
            active={statusFilter === s}
            label={STATUS_LABELS[s]}
            count={counts[s]}
          />
        ))}
      </div>

      <Card title={`Properties (${properties.length})`}>
        {properties.length === 0 ? (
          <div className="text-sm text-zinc-400">
            {statusFilter
              ? <>Keine Properties im Status „{STATUS_LABELS[statusFilter]}".</>
              : <>Noch keine Properties. Lege über <Link className="underline" href="/new">/new</Link> ein Objekt an.</>}
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {properties.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/property/${p.id}`} className="text-sm font-semibold text-white hover:underline">
                      {p.title}
                    </Link>
                    <StatusBadge status={p.status} size="sm" />
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {p.location} • {p.size} m² • Preis {eur(p.price)} • Miete {eur(p.rent)}/Monat
                    {p.analyses && p.analyses.length > 0 ? (
                      <> • Score <span className="text-zinc-200">{p.analyses[0].score}/100</span></>
                    ) : null}
                  </div>
                </div>
                <PropertyActions id={p.id} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function FilterTab({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-indigo-500 bg-indigo-500/10 text-white"
          : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:text-white"
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-indigo-500/30 text-indigo-100" : "bg-zinc-900 text-zinc-400"}`}>
        {count}
      </span>
    </Link>
  );
}
