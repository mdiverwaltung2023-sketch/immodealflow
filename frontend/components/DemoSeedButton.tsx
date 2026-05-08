"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";

/**
 * Button + Status-Anzeige für POST /me/seed-demo-listings.
 * Legt 5 Beispiel-Inserate (MFH/Gewerbe/Mischnutzung) mit Bildern an,
 * damit der User sofort die Marketplace-Optik beurteilen kann.
 *
 * Idempotent — Backend prüft, ob bereits aktive Inserate existieren.
 */
export function DemoSeedButton({ variant = "card" }: { variant?: "card" | "inline" }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function seed() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await apiFetch("/me/seed-demo-listings", { method: "POST" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      const data = (await res.json()) as { created: number; message: string };
      setMsg(data.message);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={seed}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Lade Beispiele…" : "5 Beispiel-Inserate laden"}
        </button>
        {msg ? <span className="text-xs text-emerald-700">{msg}</span> : null}
        {err ? <span className="text-xs text-rose-600">{err}</span> : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          <path d="M9 10h.01M12 10h.01M15 10h.01" />
        </svg>
      </div>
      <h3 className="mt-3 text-base font-semibold text-zinc-900">
        Marketplace ausprobieren
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600">
        Lade 5 Beispiel-Inserate (MFH-Bestand Berlin, Geschäftshaus mit REWE-Anker, Off-Market
        Hamburg, Mischnutzung Leipzig, Logistikhalle Augsburg) mit Bildern und vollständigen
        Eckdaten — damit du Optik und Detailseite beurteilen kannst.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={seed}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Spinner /> Lade…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Beispiel-Inserate laden
            </>
          )}
        </button>
      </div>
      {msg ? <div className="mt-3 text-xs text-emerald-700">{msg}</div> : null}
      {err ? <div className="mt-3 text-xs text-rose-600">{err}</div> : null}
      <div className="mt-3 text-[10px] uppercase tracking-wider text-zinc-400">
        Idempotent — kein Mehrfach-Anlegen
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 01-10 10" strokeLinecap="round" />
    </svg>
  );
}
