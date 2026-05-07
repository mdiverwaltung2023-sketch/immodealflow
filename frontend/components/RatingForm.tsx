"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { StarPicker } from "@/components/StarRating";
import { useApiFetch } from "@/lib/client-fetch";

/**
 * Wiederverwendbare Bewertung-Eingabe für eine bestimmte Inquiry.
 * Zeigt Sterne-Auswahl + Pflicht-Text mit rechtlichem Hinweis.
 */
export function RatingForm({ inquiryId, audience }: { inquiryId: string; audience: "seller" | "investor" }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (stars < 1 || stars > 5) {
      setError("Bitte 1–5 Sterne auswählen.");
      return;
    }
    if (body.trim().length < 20) {
      setError("Bitte mindestens 20 Zeichen — bitte sachlich und tatsachenbasiert.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch("/me/ratings", {
        method: "POST",
        body: JSON.stringify({ inquiryId, stars, body: body.trim() })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  const targetLabel = audience === "seller" ? "den Verkäufer" : "den Investor";

  return (
    <Card title={`Bewertung für ${targetLabel} abgeben`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Sterne</div>
          <StarPicker value={stars} onChange={setStars} disabled={busy} />
        </div>

        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Beschreibung</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              audience === "seller"
                ? `z. B. Verkäufer hat alle Unterlagen rechtzeitig übergeben, Termine pünktlich eingehalten, Notartermin ohne Verzögerung. (mind. 20 Zeichen)`
                : `z. B. Investor hat zugesagten Kaufpreis fristgerecht überwiesen, Notartermin pünktlich wahrgenommen, professionelle Kommunikation. (mind. 20 Zeichen)`
            }
            rows={5}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-1 text-[10px] text-zinc-500">
            Bitte nur überprüfbare Tatsachen angeben — keine Beleidigungen oder
            unbelegte Behauptungen. Die bewertete Person erhält ein Recht auf
            Gegendarstellung. (DSGVO / § 4 UWG / BGH-Rechtsprechung)
          </div>
        </div>

        {error ? <div className="text-xs text-rose-300">{error}</div> : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          {busy ? "Sende…" : "Bewertung abgeben"}
        </button>
      </form>
    </Card>
  );
}
