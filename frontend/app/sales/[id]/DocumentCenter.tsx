"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useApiFetch } from "@/lib/client-fetch";
import { uploadDocumentToBlob } from "@/lib/upload-document";
import {
  SALE_DOC_LABELS,
  SALE_DOC_ORDER,
  type SaleDocKindT,
  type SaleDocumentT
} from "@/lib/api";

/**
 * Dokumenten-Center mit fixen Slots für alle 14 Kategorien.
 * Pro Slot:
 *  - Wenn Dokument vorhanden: Dateiname + Größe + Download-Link + Ersetzen + Löschen
 *  - Wenn nicht vorhanden: Upload-Button (PDF/DOC/JPG/PNG, max 4 MB)
 *
 * Upload-Flow: Datei -> /api/upload-document (Vercel Blob) -> URL erhalten
 *   -> POST /me/sale-processes/:id/documents mit { kind, url, filename, sizeBytes }
 */
export function DocumentCenter({
  processId,
  initialDocs
}: {
  processId: string;
  initialDocs: SaleDocumentT[];
}) {
  const [docs, setDocs] = useState<SaleDocumentT[]>(initialDocs);
  const docByKind = new Map<SaleDocKindT, SaleDocumentT>(
    docs.map((d) => [d.kind, d])
  );

  function onUploaded(doc: SaleDocumentT) {
    setDocs((prev) => {
      const others = prev.filter((d) => d.kind !== doc.kind);
      return [...others, doc];
    });
  }
  function onDeleted(kind: SaleDocKindT) {
    setDocs((prev) => prev.filter((d) => d.kind !== kind));
  }

  return (
    <div className="space-y-1">
      <div className="grid gap-2 md:grid-cols-2">
        {SALE_DOC_ORDER.map((kind) => (
          <DocSlot
            key={kind}
            processId={processId}
            kind={kind}
            doc={docByKind.get(kind) ?? null}
            onUploaded={onUploaded}
            onDeleted={onDeleted}
          />
        ))}
      </div>
      <div className="pt-2 text-[10px] text-zinc-400">
        Pro Kategorie genau eine Datei (Re-Upload überschreibt). Max 50 MB.
        Erlaubt: PDF, DOCX, XLSX, JPG, PNG.
      </div>
    </div>
  );
}

function bytesHuman(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function DocSlot({
  processId,
  kind,
  doc,
  onUploaded,
  onDeleted
}: {
  processId: string;
  kind: SaleDocKindT;
  doc: SaleDocumentT | null;
  onUploaded: (doc: SaleDocumentT) => void;
  onDeleted: (kind: SaleDocKindT) => void;
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const { user } = useUser();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function startUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!user?.id) {
      setErr("Nicht eingeloggt - bitte Seite neu laden.");
      return;
    }
    setBusy(true);
    setProgress(0);
    setErr(null);
    try {
      // 1) Direct-to-Blob-Upload via @vercel/blob/client. Die Datei laeuft
      //    NICHT durch die Vercel-Function -> kein 4,5-MB-Body-Limit mehr
      //    (frueherer "Upload-Fehler 413" / "Failed to fetch" bei grossen
      //    Dokumenten wie gescannten Grundbuchauszuegen). Max 50 MB, vom
      //    Token-Handler /api/blob-upload validiert.
      const up = await uploadDocumentToBlob({
        file: f,
        userId: user.id,
        kind,
        onProgress: (p) => setProgress(p)
      });
      // 2) Backend-Eintrag (upsert pro processId+kind)
      const regRes = await apiFetch(`/me/sale-processes/${processId}/documents`, {
        method: "POST",
        body: JSON.stringify({
          kind,
          url: up.url,
          filename: up.filename,
          sizeBytes: up.sizeBytes
        })
      });
      if (!regRes.ok) {
        const j = await regRes.json().catch(() => null);
        setErr(j?.error ?? `Backend-Fehler (${regRes.status})`);
        return;
      }
      const newDoc = (await regRes.json()) as SaleDocumentT;
      onUploaded(newDoc);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Fehler");
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function deleteDoc() {
    if (!doc) return;
    if (!confirm(`Dokument "${SALE_DOC_LABELS[kind]}" löschen?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(
        `/me/sale-processes/${processId}/documents/${kind}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErr(j?.error ?? `Fehler ${res.status}`);
        return;
      }
      onDeleted(kind);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-3 ${
        doc ? "border-emerald-200 bg-emerald-50/40" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
            {SALE_DOC_LABELS[kind]}
          </div>
          {doc ? (
            <div className="mt-1 truncate text-xs text-zinc-600">
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline"
              >
                {doc.filename}
              </a>
              <span className="ml-1 text-[10px] text-zinc-400">
                {bytesHuman(doc.sizeBytes)} · hochgeladen{" "}
                {new Date(doc.createdAt).toLocaleDateString("de-DE")}
              </span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-zinc-400">— noch nicht hochgeladen</div>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt,application/pdf"
            onChange={startUpload}
            disabled={busy}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {busy
              ? progress != null
                ? `${progress}%`
                : "…"
              : doc
                ? "Ersetzen"
                : "Hochladen"}
          </button>
          {doc ? (
            <button
              type="button"
              onClick={deleteDoc}
              disabled={busy}
              className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Löschen
            </button>
          ) : null}
        </div>
      </div>

      {err ? (
        <div className="mt-2 rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
          {err}
        </div>
      ) : null}
    </div>
  );
}
