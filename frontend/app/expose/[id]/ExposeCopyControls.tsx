"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { EXPOSE_AUDIENCE_LABELS, type ExposeAudienceT, type ExposeContentT } from "@/lib/api";

// No-Print-Steuerung im Exposé: KI-Investment-These generieren / neu
// generieren, Zielgruppe waehlen. Nach Erfolg wird die Server-Seite
// per router.refresh() neu geladen, sodass die These-Sektion erscheint.
const AUDIENCES: ExposeAudienceT[] = ["AUTO", "INVESTOR", "OWNER"];

export function ExposeCopyControls({
  listingId,
  initial
}: {
  listingId: string;
  initial: ExposeContentT | null;
}) {
  const api = useApiFetch();
  const router = useRouter();
  const [audience, setAudience] = useState<ExposeAudienceT>(initial?.audience ?? "AUTO");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/me/listings/${listingId}/expose?force=true`, {
        method: "POST",
        body: JSON.stringify({ audience })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt.slice(0, 200) || `Fehler ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print rounded-xl border border-teal-200 bg-teal-50 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-teal-900">
          KI-Investment-These{initial ? " neu generieren" : ""}
        </span>

        <div className="inline-flex overflow-hidden rounded-lg border border-teal-300">
          {AUDIENCES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(a)}
              disabled={busy}
              className={`px-3 py-1 text-xs font-medium transition ${
                audience === a ? "bg-teal-600 text-white" : "bg-white text-teal-800 hover:bg-teal-100"
              }`}
            >
              {EXPOSE_AUDIENCE_LABELS[a]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? "Generiere …" : initial ? "Neu generieren" : "Mit KI erzeugen"}
        </button>

        {initial?.model ? (
          <span className="text-[11px] text-teal-700/70">
            zuletzt: {EXPOSE_AUDIENCE_LABELS[initial.audience]} · {initial.model}
          </span>
        ) : null}
      </div>

      {error ? <div className="mt-2 text-xs text-rose-600">{error}</div> : null}
      {busy ? (
        <div className="mt-2 text-[11px] text-teal-700">
          Die KI schreibt die Investment-These aus den Objektdaten – das dauert einige Sekunden.
        </div>
      ) : null}
    </div>
  );
}
