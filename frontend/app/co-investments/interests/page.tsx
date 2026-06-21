import Link from "next/link";
import {
  CoInvestInterestReceivedListSchema,
  CoInvestInterestSentListSchema,
  COINVEST_INTEREST_STATUS_LABELS,
  ASSET_TYPE_LABELS,
  type CoInvestInterestReceivedT,
  type CoInvestInterestSentT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { CoInvestVisual } from "../CoInvestVisual";

export const dynamic = "force-dynamic";

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function assetLabel(t: string | null | undefined): string {
  if (!t) return "—";
  return (ASSET_TYPE_LABELS as Record<string, string>)[t] ?? t;
}
const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-teal-100 text-teal-800",
  DECLINED: "bg-slate-200 text-slate-600",
  WITHDRAWN: "bg-slate-200 text-slate-600"
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status] ?? "bg-slate-100 text-slate-600"}`}>
      {COINVEST_INTEREST_STATUS_LABELS[status as keyof typeof COINVEST_INTEREST_STATUS_LABELS] ?? status}
    </span>
  );
}

function Row({ id, title, imageUrl, assetType, location, capitalNeed, status, side }: {
  id: string; title: string; imageUrl?: string | null; assetType?: string | null;
  location: string; capitalNeed?: number | null; status: string; side: string;
}) {
  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-stretch gap-0">
        <div className="w-28 shrink-0">
          <CoInvestVisual imageUrl={imageUrl} assetType={assetType} title={title} heightCls="h-full min-h-[96px]" rounded="" />
        </div>
        <div className="flex flex-1 items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-slate-900">{title}</span>
              <StatusBadge status={status} />
            </div>
            <div className="mt-0.5 text-sm text-slate-500">
              {assetLabel(assetType)}{location ? ` · ${location}` : ""} · {eur(capitalNeed)}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">{side}</div>
          </div>
          <Link href={`/co-investments/deal/${id}`}
            className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
            Öffnen →
          </Link>
        </div>
      </div>
    </li>
  );
}

export default async function InterestsPage() {
  await requireOnboardedUser();
  const [received, sent] = await Promise.all([
    apiGet("/me/coinvest-interests/received", CoInvestInterestReceivedListSchema).catch(() => [] as CoInvestInterestReceivedT[]),
    apiGet("/me/coinvest-interests/sent", CoInvestInterestSentListSchema).catch(() => [] as CoInvestInterestSentT[])
  ]);

  return (
    <main className="w-full px-4 py-8">
      <Link href="/co-investments" className="text-sm text-teal-700 hover:underline">← Zum Marktplatz</Link>
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-slate-900">Anfragen & Deal-Rooms</h1>
        <p className="mt-1 text-sm text-slate-600">Eingegangene Interessen an deinen Gesuchen und deine eigenen Interessenbekundungen.</p>
      </header>

      <section className="mb-9">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Eingegangen ({received.length})</h2>
        {received.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Noch keine Interessen an deinen Gesuchen.
          </p>
        ) : (
          <ul className="space-y-3">
            {received.map((it) => (
              <Row key={it.id} id={it.id} title={it.request.title} imageUrl={it.request.imageUrl}
                assetType={it.request.assetType} location={it.request.location} capitalNeed={it.request.capitalNeed}
                status={it.status} side={it.status === "PENDING" ? "Wartet auf deine Antwort" : `Interessent: ${it.fromUser.name ?? it.fromUser.label ?? "—"}`} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Von mir gesendet ({sent.length})</h2>
        {sent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Du hast noch kein Interesse bekundet. Stöbere im{" "}
            <Link href="/co-investments" className="font-medium text-teal-700 underline">Marktplatz</Link>.
          </p>
        ) : (
          <ul className="space-y-3">
            {sent.map((it) => (
              <Row key={it.id} id={it.id} title={it.request.title} imageUrl={it.request.imageUrl}
                assetType={it.request.assetType} location={it.request.location} capitalNeed={it.request.capitalNeed}
                status={it.status} side={it.status === "ACCEPTED" ? `Gesuchsteller: ${it.owner.name ?? it.owner.label ?? "—"}` : "Warte auf Antwort"} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
