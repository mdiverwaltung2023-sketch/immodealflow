"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Button } from "@/components/ui";
import { SALE_STAGE_LABELS, type SaleStageT } from "@/lib/api";

/**
 * Klickbarer Stage-Stepper. Aktive Stage wird hervorgehoben; alle vorherigen
 * sind als "erledigt" markiert. Klick auf eine Stage öffnet einen Dialog
 * mit optionaler Notiz und sendet PATCH /me/sale-processes/:id/stage.
 *
 * "Abbrechen"-Knopf separat unten — setzt Stage auf ABGEBROCHEN.
 */
export function StageStepper({
  processId,
  currentStage,
  allStages
}: {
  processId: string;
  currentStage: SaleStageT;
  allStages: SaleStageT[];
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerStage, setPickerStage] = useState<SaleStageT | null>(null);
  const [note, setNote] = useState("");

  const isCancelled = currentStage === "ABGEBROCHEN";
  const currentIdx = isCancelled ? -1 : allStages.indexOf(currentStage);

  async function setStage(stage: SaleStageT, noteText: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/me/sale-processes/${processId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage, note: noteText.trim() || null })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      setPickerStage(null);
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {allStages.map((stage, idx) => {
          const isCurrent = !isCancelled && stage === currentStage;
          const isDone = !isCancelled && idx < currentIdx;
          return (
            <li key={stage}>
              <button
                type="button"
                onClick={() => setPickerStage(stage)}
                disabled={busy}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition disabled:opacity-50 ${
                  isCurrent
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900 font-semibold"
                    : isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isCurrent
                      ? "bg-indigo-600 text-white"
                      : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-200 text-zinc-500"
                  }`}
                >
                  {isDone ? "✓" : idx + 1}
                </span>
                <span className="truncate">{SALE_STAGE_LABELS[stage]}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3">
        <div className="text-xs text-zinc-500">
          Klick auf eine Station, um den Status zu setzen oder eine Notiz zu hinterlegen.
        </div>
        {!isCancelled ? (
          <button
            type="button"
            onClick={() => setPickerStage("ABGEBROCHEN")}
            disabled={busy}
            className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
          >
            Verkauf abbrechen …
          </button>
        ) : (
          <div className="text-xs font-semibold text-rose-600">
            ⚠ Abgebrochen — Wiederherstellung über Stage-Klick.
          </div>
        )}
      </div>

      {pickerStage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setPickerStage(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-zinc-900">
              Status setzen: {SALE_STAGE_LABELS[pickerStage]}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Optionale Notiz wird im Verlauf festgehalten.
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. Notartermin auf 2026-06-12 um 14 Uhr verschoben"
              className="mt-3 min-h-[90px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {error ? (
              <div className="mt-3 rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPickerStage(null)} disabled={busy}>
                Abbrechen
              </Button>
              <Button
                onClick={() => setStage(pickerStage, note)}
                disabled={busy}
                variant={pickerStage === "ABGEBROCHEN" ? "danger" : "primary"}
              >
                {busy ? "Sende …" : "Status setzen"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
