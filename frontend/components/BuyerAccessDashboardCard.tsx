"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import type { BuyerDocAccessWithListingT } from "@/lib/api";

/**
 * Phase M4 — Dashboard-Card mit den 5 letzten aktiven Dokumenten-Freigaben.
 * Wird nur im Verkaeufer-Mode angezeigt.
 */
export function BuyerAccessDashboardCard() {
  const apiFetch = useApiFetch();
  const [items, setItems] = useState<BuyerDocAccessWithListingT[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/me/buyer-access?activeOnly=true&limit=5");
        if (!res.ok) {
          setItems([]);
          return;
        }
        setItems((await res.json()) as BuyerDocAccessWithListingT[]);
      } catch {
        setItems([]);
      }
    })();
  }, [apiFetch]);

  if (items === null) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-400">
        Lade Freigaben …
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            Aktive Dokumenten-Freigaben
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Letzte 5 — wer hat Zugriff auf welche Unterlagen.
          </div>
        </div>
        <Link
          href="/freigaben"
          className="text-xs font-medium text-indigo-700 hover:underline"
        >
          Alle ansehen →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-xs text-zinc-500">
          Noch keine aktiven Freigaben. Auf einem Inserat unter
          „Dokumenten-Freigaben für Kaufinteressenten" → „+ Neue Freigabe".
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-zinc-900">
                  {a.buyerLabel || "Ohne Label"}
                </div>
                <div className="truncate text-[10px] text-zinc-500">
                  {a.listing.title}
                </div>
              </div>
              <div className="shrink-0 text-right text-[10px] text-zinc-500">
                {a.accessCount} Abruf
                {a.accessCount === 1 ? "" : "e"}
                {a.lastAccessedAt ? (
                  <div className="text-zinc-400">
                    {new Date(a.lastAccessedAt).toLocaleDateString("de-DE")}
                  </div>
                ) : (
                  <div className="text-zinc-400">noch nicht geöffnet</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
