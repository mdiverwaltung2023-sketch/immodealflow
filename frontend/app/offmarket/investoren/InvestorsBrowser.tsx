"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { OffmarketInvestorCard } from "@/components/OffmarketInvestorCard";
import {
  ASSET_TYPE_LABELS,
  type OffmarketInvestorMatchT,
  type OffmarketLeadT,
  type AssetTypeT
} from "@/lib/api";

const ASSET_TYPES: AssetTypeT[] = [
  "MFH",
  "COMMERCIAL",
  "MIXED_USE",
  "SINGLE_FAMILY",
  "APARTMENT",
  "LAND",
  "OTHER"
];

export function InvestorsBrowser({
  investors,
  myLeads
}: {
  investors: OffmarketInvestorMatchT[];
  myLeads: OffmarketLeadT[];
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [filterType, setFilterType] = useState<AssetTypeT | "">("");
  const [filterCity, setFilterCity] = useState("");
  const [minTicket, setMinTicket] = useState(0);
  const [pickerForId, setPickerForId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return investors.filter((i) => {
      if (filterType && i.preferredAssetTypes && i.preferredAssetTypes.length > 0) {
        if (!i.preferredAssetTypes.includes(filterType)) return false;
      }
      if (filterCity) {
        const c = filterCity.toLowerCase();
        const ok = (i.preferredRegions ?? []).some((r) =>
          r.toLowerCase().includes(c)
        );
        if (!ok) return false;
      }
      if (minTicket && i.maxTicketSize && i.maxTicketSize < minTicket) return false;
      return true;
    });
  }, [investors, filterType, filterCity, minTicket]);

  async function invite(leadId: string, userId: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/me/offmarket-leads/${leadId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorIds: [userId] })
      });
      if (!res.ok) throw new Error(await res.text());
      setPickerForId(null);
      router.push(`/offmarket/leads/${leadId}`);
    } catch (e) {
      setErr((e as Error).message || "Einladen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 lg:grid-cols-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Asset-Typ
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AssetTypeT | "")}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">alle</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {ASSET_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Stadt / Region
          </label>
          <input
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="z.B. Berlin"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Mindest-Ticket
          </label>
          <input
            type="number"
            value={minTicket || ""}
            onChange={(e) => setMinTicket(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="500000"
          />
        </div>
      </div>

      <div className="text-xs text-zinc-500">
        {filtered.length} von {investors.length} Investoren passend.
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((i) => (
          <div key={i.userId} className="relative">
            <OffmarketInvestorCard
              match={i}
              showScore={false}
              onInvite={() => setPickerForId(i.userId)}
            />
            {pickerForId === i.userId && (
              <div className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-amber-300 bg-white p-3 shadow-lg">
                <div className="mb-2 text-xs font-semibold text-zinc-700">
                  Zu welchem Offmarket-Inserat einladen?
                </div>
                {myLeads.length === 0 ? (
                  <div className="text-xs text-zinc-500">
                    Sie haben noch kein Offmarket-Inserat —{" "}
                    <Link
                      href="/offmarket/leads/neu"
                      className="font-semibold text-amber-700 underline"
                    >
                      jetzt anlegen
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {myLeads.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        disabled={busy}
                        onClick={() => invite(l.id, i.userId)}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-left text-xs hover:border-amber-300 hover:bg-amber-50"
                      >
                        <div className="font-semibold text-zinc-900">{l.title}</div>
                        <div className="text-zinc-500">
                          {l.city} · {l.approxArea} m² ·{" "}
                          {Math.round(l.approxPrice / 1000).toLocaleString("de-DE")} k €
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPickerForId(null)}
                  className="mt-2 w-full text-[11px] text-zinc-500 hover:text-zinc-700"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
