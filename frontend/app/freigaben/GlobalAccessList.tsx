"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import { SALE_DOC_LABELS, type BuyerDocAccessWithListingT } from "@/lib/api";

type Filter = "all" | "active" | "revoked";

export function GlobalAccessList() {
  const apiFetch = useApiFetch();
  const [items, setItems] = useState<BuyerDocAccessWithListingT[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/me/buyer-access?limit=200");
        if (!res.ok) {
          setErr(`Fehler ${res.status}`);
          return;
        }
        const json = (await res.json()) as BuyerDocAccessWithListingT[];
        setItems(json);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Fehler");
      }
    })();
  }, [apiFetch]);

  if (err) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {err}
      </div>
    );
  }
  if (!items) return <div className="text-sm text-zinc-400">Lade …</div>;

  const filtered = items.filter((a) => {
    const isRevoked = !!a.revokedAt;
    const isExpired =
      !!a.expiresAt && new Date(a.expiresAt).getTime() < Date.now();
    if (filter === "active") return !isRevoked && !isExpired;
    if (filter === "revoked") return isRevoked || isExpired;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "revoked"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f
                ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {f === "all"
              ? `Alle (${items.length})`
              : f === "active"
                ? "Aktiv"
                : "Widerrufen / Abgelaufen"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          Keine Freigaben in dieser Sicht.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <Row key={a.id} a={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ a }: { a: BuyerDocAccessWithListingT }) {
  const isRevoked = !!a.revokedAt;
  const isExpired = !!a.expiresAt && new Date(a.expiresAt).getTime() < Date.now();
  const status = isRevoked ? "Widerrufen" : isExpired ? "Abgelaufen" : "Aktiv";
  const tone = isRevoked
    ? "bg-zinc-100 text-zinc-500"
    : isExpired
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-700";

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">
              {a.buyerLabel || "Ohne Label"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}
            >
              {status}
            </span>
            <span className="text-[11px] text-zinc-500">
              {a.accessCount} Abruf(e)
              {a.lastAccessedAt
                ? ` · zuletzt ${new Date(a.lastAccessedAt).toLocaleString("de-DE")}`
                : ""}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-zinc-600">
            <Link
              href={`/listings/${a.listing.id}/edit`}
              className="text-indigo-700 hover:underline"
            >
              {a.listing.title}
            </Link>
            <span className="text-zinc-400">
              {" · "}
              {a.listing.city}
              {a.listing.district ? ` · ${a.listing.district}` : ""}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {a.allowedDocKinds.map((k) => (
          <span
            key={k}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-600"
          >
            {SALE_DOC_LABELS[k]}
          </span>
        ))}
      </div>
    </li>
  );
}
