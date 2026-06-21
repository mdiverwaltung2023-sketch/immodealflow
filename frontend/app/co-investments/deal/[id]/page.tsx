import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CoInvestInterestDetailSchema,
  ASSET_TYPE_LABELS,
  INVEST_STRATEGY_LABELS,
  COINVEST_INTEREST_STATUS_LABELS
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { CoInvestVisual } from "../../CoInvestVisual";
import { InterestResponseForm } from "../../InterestResponseForm";
import { DealRoomChat } from "../../DealRoomChat";

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

export default async function DealRoomPage({ params }: { params: { id: string } }) {
  await requireOnboardedUser();
  const it = await apiGet(`/me/coinvest-interests/${params.id}`, CoInvestInterestDetailSchema).catch(() => null);
  if (!it) notFound();

  const r = it.request;
  const accepted = it.status === "ACCEPTED";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/co-investments/interests" className="text-sm text-teal-700 hover:underline">← Anfragen & Deal-Rooms</Link>

      <div className="relative mt-3 overflow-hidden rounded-2xl border border-slate-200">
        <CoInvestVisual imageUrl={r.imageUrl} assetType={r.assetType} title={r.title} heightCls="h-40" rounded="" />
        <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${STATUS_TONE[it.status]}`}>
          {COINVEST_INTEREST_STATUS_LABELS[it.status]}
        </span>
      </div>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-slate-900">{r.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {assetLabel(r.assetType)} · {r.location || "—"}
          {r.strategy ? ` · ${INVEST_STRATEGY_LABELS[r.strategy]}` : ""}
          {" · "}{r.kind === "OBJECT" ? "Kapitalbedarf" : "Ticket"} {eur(r.capitalNeed)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {it.iAmOwner ? "Du bist Gesuchsteller." : "Du hast Interesse bekundet."}
          {accepted && it.counterpart ? ` · ${it.counterpart.role}: ${it.counterpart.name}` : ""}
        </p>
      </header>

      {(it.fromNote || it.ownerNote) && (
        <section className="mt-5 space-y-3">
          {it.fromNote && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Vorstellung des Kapitalpartners</div>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{it.fromNote}</p>
            </div>
          )}
          {it.ownerNote && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Notiz des Gesuchstellers</div>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{it.ownerNote}</p>
            </div>
          )}
        </section>
      )}

      <section className="mt-6">
        {accepted ? (
          <DealRoomChat interestId={it.id} />
        ) : it.iAmOwner && it.status === "PENDING" ? (
          <InterestResponseForm interestId={it.id} />
        ) : it.status === "PENDING" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Dein Interesse wurde gesendet. Sobald der Gesuchsteller annimmt, öffnet sich hier der Deal-Room.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Diese Anfrage ist {COINVEST_INTEREST_STATUS_LABELS[it.status].toLowerCase()} — kein Deal-Room aktiv.
          </div>
        )}
      </section>

      <p className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-400">
        Kontaktaufnahme, Prüfung und Abschluss erfolgen eigenverantwortlich. Oikos vermittelt nur den Kontakt.
      </p>
    </main>
  );
}
