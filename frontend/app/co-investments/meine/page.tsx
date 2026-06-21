import Link from "next/link";
import {
  CoInvestRequestListSchema,
  ASSET_TYPE_LABELS,
  COINVEST_STATUS_LABELS,
  COINVEST_KIND_LABELS,
  type CoInvestRequestT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { CoInvestVisual } from "../CoInvestVisual";
import { PublishButtons } from "../PublishButtons";

export const dynamic = "force-dynamic";

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function assetLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return (ASSET_TYPE_LABELS as Record<string, string>)[t] ?? t;
}

export default async function MyCoInvestPage() {
  await requireOnboardedUser();
  const own = await apiGet("/me/coinvest-requests", CoInvestRequestListSchema).catch(
    () => [] as CoInvestRequestT[]
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link href="/co-investments" className="text-sm text-teal-700 hover:underline">← Zum Marktplatz</Link>
      <header className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meine Gesuche</h1>
          <p className="mt-1 text-sm text-slate-600">Entwürfe veröffentlichen, zurückziehen oder Matches ansehen.</p>
        </div>
        <Link href="/co-investments/neu"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
          + Neues Gesuch
        </Link>
      </header>

      {own.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <p className="text-sm text-slate-500">Noch keine Gesuche. Lege dein erstes an.</p>
          <Link href="/co-investments/neu"
            className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            Gesuch anlegen
          </Link>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {own.map((r) => (
            <li key={r.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative">
                <CoInvestVisual imageUrl={r.imageUrl} assetType={r.assetType} title={r.title} heightCls="h-32" />
                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-teal-700 shadow-sm">
                  {COINVEST_KIND_LABELS[r.kind]}
                </span>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{r.title}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {COINVEST_STATUS_LABELS[r.status]}
                  </span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                  <div><dt className="text-xs text-slate-400">Objektart</dt><dd>{assetLabel(r.assetType)}</dd></div>
                  <div><dt className="text-xs text-slate-400">Standort</dt><dd>{r.location || "—"}</dd></div>
                  <div><dt className="text-xs text-slate-400">Kapitalbedarf</dt><dd>{eur(r.capitalNeed)}</dd></div>
                  <div><dt className="text-xs text-slate-400">Rendite-Erw.</dt><dd>{r.targetReturnPct != null ? `${r.targetReturnPct} %` : "—"}</dd></div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <PublishButtons id={r.id} status={r.status} />
                  <Link href={`/co-investments/${r.id}`} className="text-sm font-medium text-teal-700 hover:underline">
                    Passende Kapitalgeber →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
