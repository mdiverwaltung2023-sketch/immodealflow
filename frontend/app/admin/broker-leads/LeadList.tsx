"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import {
  BROKER_LEAD_STATUS_LABELS,
  type BrokerLeadStatusT,
  type BrokerLeadT
} from "@/lib/api";

const STATUS_TONES: Record<BrokerLeadStatusT, string> = {
  NEW: "bg-rose-50 text-rose-700 border-rose-200",
  CONTACTED: "bg-amber-50 text-amber-800 border-amber-200",
  QUALIFIED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  CLOSED_WON: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED_LOST: "bg-zinc-50 text-zinc-500 border-zinc-200"
};

const STATUS_OPTIONS: BrokerLeadStatusT[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CLOSED_WON",
  "CLOSED_LOST"
];

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

export function LeadList({ initial }: { initial: BrokerLeadT[] }) {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [items, setItems] = useState<BrokerLeadT[]>(initial);
  const [filter, setFilter] = useState<BrokerLeadStatusT | "ALL">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const filtered = filter === "ALL" ? items : items.filter((l) => l.status === filter);

  async function updateLead(id: string, patch: Partial<Pick<BrokerLeadT, "status" | "internalNote">>) {
    setBusyId(id);
    setErr(null);
    try {
      const r = await apiFetch(`/admin/broker-leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${r.status}`);
        return;
      }
      const updated = (await r.json()) as BrokerLeadT;
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")} label="Alle" />
        {STATUS_OPTIONS.map((s) => (
          <FilterChip
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={BROKER_LEAD_STATUS_LABELS[s]}
          />
        ))}
      </div>

      {err ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
          {err}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600">
          Keine Leads in diesem Filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <LeadCard key={l.id} lead={l} busy={busyId === l.id} onUpdate={updateLead} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
          : "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
      }
    >
      {label}
    </button>
  );
}

function LeadCard({
  lead,
  busy,
  onUpdate
}: {
  lead: BrokerLeadT;
  busy: boolean;
  onUpdate: (id: string, patch: Partial<Pick<BrokerLeadT, "status" | "internalNote">>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(lead.internalNote ?? "");

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-zinc-900">
              {lead.firstName} {lead.lastName}
            </div>
            <div className="text-xs text-zinc-500">
              {lead.street}, {lead.postalCode} {lead.city}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {lead.assetType} · {lead.area} m² · BJ {lead.yearBuilt} ·{" "}
              {lead.locationQuality} · {lead.condition} · {lead.occupancy} ·{" "}
              {lead.saleReason} · {lead.timePressure}
              {lead.estimatedValue ? ` · ~${eur(lead.estimatedValue)}` : ""}
            </div>
          </div>
          <div className="text-right">
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_TONES[lead.status]}`}>
              {BROKER_LEAD_STATUS_LABELS[lead.status]}
            </span>
            <div className="mt-1 text-[11px] text-zinc-500">
              {new Date(lead.createdAt).toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>
      </button>

      {open ? (
        <div className="border-t border-zinc-200 bg-zinc-50/40 p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="E-Mail" value={<a href={`mailto:${lead.email}`} className="text-indigo-700 hover:underline">{lead.email}</a>} />
            <Info label="Telefon" value={<a href={`tel:${lead.phone}`} className="text-indigo-700 hover:underline">{lead.phone}</a>} />
            <Info label="Score Selbst" value={`${lead.scoreSelbst}/100`} />
            <Info label="Score Makler" value={`${lead.scoreMakler}/100`} />
          </div>

          {lead.ownerNote ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Notiz vom Eigentümer
              </div>
              <div className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">
                {lead.ownerNote}
              </div>
            </div>
          ) : null}

          {lead.aiReportSummary ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                KI-Analyse (Makler-Pfad)
              </div>
              <div className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">
                {lead.aiReportSummary}
              </div>
            </div>
          ) : null}

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Status setzen
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy || s === lead.status}
                  onClick={() => onUpdate(lead.id, { status: s })}
                  className={
                    s === lead.status
                      ? "rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 cursor-default"
                      : "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  }
                >
                  {BROKER_LEAD_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Interne Notiz
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Was wurde besprochen? Wann zurückrufen?"
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={busy || note === (lead.internalNote ?? "")}
              onClick={() => onUpdate(lead.id, { internalNote: note })}
              className="mt-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Notiz speichern
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-zinc-900">{value}</div>
    </div>
  );
}
