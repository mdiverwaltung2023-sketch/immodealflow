"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Button, Card } from "@/components/ui";
import {
  ApplicantEvaluationSchema,
  APPLICANT_RATING_LABELS,
  type ApplicantEvaluationT,
  type ApplicantRatingT
} from "@/lib/api";

const RATING_TONES: Record<ApplicantRatingT, string> = {
  SEHR_PASSEND: "bg-emerald-600 text-white",
  PASSEND: "bg-indigo-600 text-white",
  BEDINGT_PASSEND: "bg-amber-500 text-white",
  EHER_UNPASSEND: "bg-rose-600 text-white"
};

export function ApplicantEvaluationCard({
  applicationId,
  initialEvaluations
}: {
  applicationId: string;
  initialEvaluations: ApplicantEvaluationT[];
}) {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [latest, setLatest] = useState<ApplicantEvaluationT | null>(
    initialEvaluations[0] ?? null
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function evaluate() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await apiFetch(
        `/me/rental-applications/${applicationId}/evaluate`,
        { method: "POST" }
      );
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        setErr(j?.error ?? `Fehler ${r.status}`);
        return;
      }
      const parsed = ApplicantEvaluationSchema.safeParse(j);
      if (parsed.success) {
        setLatest(parsed.data);
        router.refresh();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="KI-Bewertung">
      {!latest ? (
        <div className="space-y-3">
          <div className="text-sm text-zinc-600">
            Noch keine KI-Bewertung. Claude analysiert die Bewerber-Daten
            anhand objektiver, nicht-diskriminierender Kriterien und gibt eine
            Einschätzung mit Stärken, Risiken, offenen Fragen und einer
            Handlungsempfehlung.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={evaluate} disabled={busy}>
              {busy ? "KI bewertet …" : "Bewertung erstellen"}
            </Button>
            {err ? <span className="text-xs text-rose-600">{err}</span> : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${RATING_TONES[latest.rating]}`}
            >
              {APPLICANT_RATING_LABELS[latest.rating]}
            </span>
            {latest.recommendViewing ? (
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                Besichtigung empfohlen
              </span>
            ) : (
              <span className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs text-zinc-700">
                Keine Besichtigungs-Empfehlung
              </span>
            )}
            <span className="text-[10px] text-zinc-400">
              {new Date(latest.createdAt).toLocaleString("de-DE")}
              {latest.model ? ` · ${latest.model}` : ""}
            </span>
          </div>

          <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 italic">
            {latest.summary}
          </div>

          {/* 5 Faktor-Bewertungen */}
          <div className="grid gap-3 md:grid-cols-2">
            <FactorBlock label="Finanzielle Stabilität" text={latest.financialStability} />
            <FactorBlock label="Passung Wohnungsgröße" text={latest.sizeFit} />
            <FactorBlock label="Erwartete Mietdauer" text={latest.expectedDuration} />
            <FactorBlock label="Zuverlässigkeit" text={latest.reliability} />
            <FactorBlock label="Kommunikationsqualität" text={latest.communication} />
          </div>

          {/* Stärken / Risiken / offene Fragen */}
          <div className="grid gap-3 md:grid-cols-3">
            <ListBlock label="Stärken" items={latest.strengths} tone="emerald" />
            <ListBlock label="Risiken" items={latest.risks} tone="rose" />
            <ListBlock
              label="Offene Fragen"
              items={latest.openQuestions}
              tone="indigo"
            />
          </div>

          {/* Handlungsempfehlungen */}
          {(latest.requestDocuments || latest.suggestFollowUp) ? (
            <div className="grid gap-3 md:grid-cols-2">
              {latest.requestDocuments ? (
                <FactorBlock
                  label="Unterlagen anfordern"
                  text={latest.requestDocuments}
                />
              ) : null}
              {latest.suggestFollowUp ? (
                <FactorBlock label="Rückfrage" text={latest.suggestFollowUp} />
              ) : null}
            </div>
          ) : null}

          {latest.rationale ? (
            <div className="rounded-lg border-l-4 border-indigo-400 bg-indigo-50 p-3 text-xs text-indigo-900">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                Begründung
              </div>
              <div className="mt-1">{latest.rationale}</div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3">
            <Button variant="secondary" onClick={evaluate} disabled={busy}>
              {busy ? "KI bewertet …" : "Neu bewerten"}
            </Button>
            {err ? <span className="text-xs text-rose-600">{err}</span> : null}
          </div>
        </div>
      )}
    </Card>
  );
}

function FactorBlock({ label, text }: { label: string; text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-xs text-zinc-700 whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function ListBlock({
  label,
  items,
  tone
}: {
  label: string;
  items: string[];
  tone: "emerald" | "rose" | "indigo";
}) {
  if (items.length === 0) return null;
  const dotTone = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    indigo: "bg-indigo-500"
  }[tone];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <ul className="mt-1 space-y-1 text-xs text-zinc-700">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${dotTone}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
