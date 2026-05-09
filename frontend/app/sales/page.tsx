import Link from "next/link";
import { z } from "zod";
import {
  SaleProcessListItemSchema,
  SALE_STAGE_LABELS,
  SALE_STAGE_ORDER,
  type SaleProcessListItemT,
  type SaleStageT
} from "@/lib/api";
import { apiGet, requireOnboardedUser } from "@/lib/api-server";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const SaleProcessListSchema = z.array(SaleProcessListItemSchema);

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function stageProgress(stage: SaleStageT): { idx: number; total: number; pct: number } {
  if (stage === "ABGEBROCHEN") return { idx: 0, total: SALE_STAGE_ORDER.length, pct: 0 };
  const idx = SALE_STAGE_ORDER.indexOf(stage);
  const total = SALE_STAGE_ORDER.length;
  return { idx: idx < 0 ? 0 : idx, total, pct: idx < 0 ? 0 : ((idx + 1) / total) * 100 };
}

export default async function SalesPage() {
  await requireOnboardedUser();
  const processes = await apiGet("/me/sale-processes", SaleProcessListSchema).catch(() => [] as SaleProcessListItemT[]);

  const active = processes.filter(
    (p) => p.currentStage !== "ABGESCHLOSSEN" && p.currentStage !== "ABGEBROCHEN"
  );
  const closed = processes.filter((p) => p.currentStage === "ABGESCHLOSSEN");
  const cancelled = processes.filter((p) => p.currentStage === "ABGEBROCHEN");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Verkaufsabwicklung</div>
          <div className="mt-1 text-sm text-zinc-500">
            Pipeline jedes deiner laufenden Verkäufe — Stationen, Notizen und Dokumente.
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <KpiPill label="Aktiv" value={active.length} tone="emerald" />
          <KpiPill label="Abgeschlossen" value={closed.length} tone="zinc" />
          <KpiPill label="Abgebrochen" value={cancelled.length} tone="rose" />
        </div>
      </div>

      <Card title={`Aktive Verkäufe (${active.length})`}>
        {active.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-zinc-200">
            {active.map((p) => (
              <ProcessRow key={p.id} process={p} />
            ))}
          </ul>
        )}
      </Card>

      {closed.length > 0 ? (
        <Card title={`Abgeschlossene Verkäufe (${closed.length})`}>
          <ul className="divide-y divide-zinc-200">
            {closed.map((p) => (
              <ProcessRow key={p.id} process={p} muted />
            ))}
          </ul>
        </Card>
      ) : null}

      {cancelled.length > 0 ? (
        <Card title={`Abgebrochene Verkäufe (${cancelled.length})`}>
          <ul className="divide-y divide-zinc-200">
            {cancelled.map((p) => (
              <ProcessRow key={p.id} process={p} muted />
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function KpiPill({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "emerald" | "zinc" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    zinc: "bg-zinc-100 text-zinc-700 border-zinc-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200"
  } as const;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${tones[tone]}`}>
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function ProcessRow({
  process,
  muted = false
}: {
  process: SaleProcessListItemT;
  muted?: boolean;
}) {
  const prog = stageProgress(process.currentStage);
  const cancelled = process.currentStage === "ABGEBROCHEN";
  return (
    <li>
      <Link
        href={`/sales/${process.id}`}
        className={`block py-3 transition hover:bg-zinc-50 -mx-2 px-2 rounded-lg ${muted ? "opacity-70" : ""}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-900 truncate">
              {process.listing.title}
            </div>
            <div className="text-xs text-zinc-500 truncate">
              {process.listing.city} · ID {process.listing.id.slice(0, 8)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  cancelled
                    ? "bg-rose-50 text-rose-700"
                    : process.currentStage === "ABGESCHLOSSEN"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-indigo-50 text-indigo-700"
                }`}
              >
                {SALE_STAGE_LABELS[process.currentStage]}
              </span>
              {process.buyer ? (
                <span className="text-zinc-500">
                  Käufer: {process.buyer.name ?? "—"}
                </span>
              ) : null}
              <span className="text-zinc-400">
                {process._count.documents} Dok · {process._count.stageLog} Einträge
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-500 shrink-0">
            <div className="font-semibold text-zinc-900">
              {process.agreedPrice
                ? eur(process.agreedPrice)
                : eur(process.listing.askingPrice)}
              {process.agreedPrice ? null : (
                <span className="ml-1 text-[10px] text-zinc-400">Angebot</span>
              )}
            </div>
            {process.targetClosingDate ? (
              <div className="mt-0.5">
                Ziel: {new Date(process.targetClosingDate).toLocaleDateString("de-DE")}
              </div>
            ) : null}
          </div>
        </div>

        {!cancelled ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full ${
                process.currentStage === "ABGESCHLOSSEN" ? "bg-emerald-500" : "bg-indigo-500"
              }`}
              style={{ width: `${prog.pct}%` }}
            />
          </div>
        ) : null}
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
      Noch keine laufenden Verkäufe. Sobald du eine Anfrage akzeptierst, taucht sie hier auf.
      Off-Market-Deals kannst du auf einem deiner Inserate über{" "}
      <Link href="/listings" className="font-medium text-indigo-600 hover:text-indigo-700">
        Meine Inserate
      </Link>
      {" "}manuell starten.
    </div>
  );
}
