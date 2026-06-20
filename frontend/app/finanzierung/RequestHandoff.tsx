"use client";

// Phase P Stufe 2 — Lead-Übergabe per Opt-in. Lädt die passenden Partner zum
// Objekt der Anfrage, lässt den Investor einen wählen + ausdrücklich
// einwilligen, und übergibt dann (Tippgeber — keine Vermittlung durch Oikos).

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui";
import {
  FinancingRequestSchema,
  MatchedPartnerSchema,
  FINANCING_PARTNER_TYPE_LABELS,
  type MatchedPartnerT,
  type FinancingRequestT
} from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

const MatchResp = z.object({ partners: z.array(MatchedPartnerSchema) });

export function RequestHandoff({
  requestId,
  propertyId,
  onDone
}: {
  requestId: string;
  propertyId: string;
  onDone: (r: FinancingRequestT) => void;
}) {
  const apiFetch = useApiFetch();
  const [open, setOpen] = useState(false);
  const [partners, setPartners] = useState<MatchedPartnerT[] | null>(null);
  const [sel, setSel] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPanel() {
    setOpen(true);
    setError(null);
    if (partners) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/properties/${propertyId}/financing-partners`);
      if (!res.ok) throw new Error(`Fehlgeschlagen (${res.status})`);
      const parsed = MatchResp.parse(await res.json());
      setPartners(parsed.partners);
      if (parsed.partners[0]) setSel(parsed.partners[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!sel || !consent) {
      setError("Partner wählen und Einwilligung bestätigen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/me/financing-requests/${requestId}/handoff`, {
        method: "POST",
        body: JSON.stringify({ partnerId: sel, consent: true })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${t}`);
      }
      onDone(FinancingRequestSchema.parse(await res.json()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={openPanel}>
        An Partner übergeben
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
      {busy && !partners ? (
        <div className="text-xs text-zinc-500">Passende Partner werden geladen…</div>
      ) : null}
      {partners && partners.length === 0 ? (
        <div className="text-xs text-zinc-600">
          Aktuell kein passender Partner im Verzeichnis.
        </div>
      ) : partners ? (
        <>
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-800"
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {FINANCING_PARTNER_TYPE_LABELS[p.type]}
              </option>
            ))}
          </select>
          <label className="flex items-start gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Ich bin einverstanden, dass meine Anfrage zur Kontaktaufnahme an den gewählten
              Partner weitergeleitet wird. Oikos vermittelt nicht; Beratung und Vermittlung
              erfolgen durch den Partner.
            </span>
          </label>
          <div className="flex items-center gap-2">
            <Button onClick={submit} disabled={busy || !consent || !sel}>
              {busy ? "Übergebe…" : "Übergeben"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
          </div>
        </>
      ) : null}
      {error ? <div className="text-xs text-rose-600">{error}</div> : null}
    </div>
  );
}
