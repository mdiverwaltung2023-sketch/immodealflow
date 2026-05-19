"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import {
  SALE_DOC_LABELS,
  type ReceivedBuyerAccessT,
  type SaleDocKindT
} from "@/lib/api";

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}
function bytesHuman(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReceivedAccessList() {
  const apiFetch = useApiFetch();
  const [items, setItems] = useState<ReceivedBuyerAccessT[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/me/buyer-access-received");
        if (!res.ok) {
          setErr(`Fehler ${res.status}`);
          return;
        }
        setItems((await res.json()) as ReceivedBuyerAccessT[]);
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
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
        Keine Freigaben erhalten. Sobald ein Verkäufer dich für ein Inserat
        freischaltet (z. B. aus deiner Anfrage), erscheinen die Unterlagen
        hier direkt — ohne dass du einen Link öffnen musst.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((a) => (
        <li
          key={a.id}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-zinc-900">
                {a.listing.title}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {a.listing.city}
                {a.listing.district ? ` · ${a.listing.district}` : ""}
                {a.listing.postalCode ? ` · ${a.listing.postalCode}` : ""}
                {a.listing.fullAddress ? ` · ${a.listing.fullAddress}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <span className="rounded-full bg-zinc-50 px-2 py-0.5">
                {eur(a.listing.askingPrice)}
              </span>
              <span className="rounded-full bg-zinc-50 px-2 py-0.5">
                {a.listing.totalArea} m²
              </span>
              {a.expiresAt ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                  Ablauf {new Date(a.expiresAt).toLocaleDateString("de-DE")}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            {a.documents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-500">
                Der Verkäufer hat {a.allowedDocKinds.length} Kategorie(n)
                freigegeben, aber noch keine Datei hochgeladen.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {a.documents.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-900">
                        {SALE_DOC_LABELS[d.kind as SaleDocKindT]}
                      </div>
                      <div className="truncate text-xs text-zinc-700">
                        {d.filename}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {bytesHuman(d.sizeBytes)} ·{" "}
                        {new Date(d.createdAt).toLocaleDateString("de-DE")}
                      </div>
                    </div>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Öffnen ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {a.allowedDocKinds.map((k) => (
              <span
                key={k}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-600"
              >
                {SALE_DOC_LABELS[k]}
              </span>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
            <span>
              freigegeben {new Date(a.createdAt).toLocaleDateString("de-DE")}
              {a.buyerLabel ? ` · vorbereitet für „${a.buyerLabel}"` : ""}
            </span>
            <Link
              href={`/marketplace/${a.listing.id}`}
              className="text-indigo-700 hover:underline"
            >
              Zum Inserat →
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
