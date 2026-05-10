"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import { Card, Button } from "@/components/ui";
import {
  RentalUnitImageSchema,
  type RentalUnitImageT
} from "@/lib/api";

/**
 * Bild-Manager fuer Mietobjekte (Phase L5.4).
 *
 * Layout: drag-and-drop-Zone oben, Galerie darunter mit Lightbox-
 * Vorschau, Loesch-Button und einem "Cover"-Badge fuer das erste Bild.
 *
 * Upload-Flow (analog Verkaufs-Listing):
 *   1) File -^> POST /api/upload-image (Vercel Blob)
 *   2) URL -^> POST /me/rental-units/:id/images (Backend-Eintrag)
 *
 * Mehrfach-Upload erlaubt (alle Files in einem Rutsch hochladen).
 */
export function RentalUnitImageManager({
  unitId,
  initialImages
}: {
  unitId: string;
  initialImages: RentalUnitImageT[];
}) {
  const apiFetch = useApiFetch();
  const router = useRouter();

  const [images, setImages] = useState<RentalUnitImageT[]>(initialImages);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  const fileInput = useRef<HTMLInputElement | null>(null);

  async function uploadOne(file: File) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`"${file.name}" ist kein Bild.`);
    }
    if (file.size > 4 * 1024 * 1024) {
      throw new Error(`"${file.name}" ist groesser als 4 MB.`);
    }
    // 1) Vercel Blob
    const form = new FormData();
    form.append("file", file);
    const up = await fetch("/api/upload-image", { method: "POST", body: form });
    if (!up.ok) {
      const j = await up.json().catch(() => ({}));
      throw new Error(j.error ?? `Upload fehlgeschlagen (${up.status})`);
    }
    const { url } = (await up.json()) as { url: string };

    // 2) Backend-Registrierung
    const r = await apiFetch(`/me/rental-units/${unitId}/images`, {
      method: "POST",
      body: JSON.stringify({ url, alt: file.name })
    });
    if (!r.ok) {
      const j = await r.json().catch(() => null);
      throw new Error(j?.error ?? `Backend-Fehler (${r.status})`);
    }
    const j = await r.json();
    const parsed = RentalUnitImageSchema.safeParse(j);
    if (!parsed.success) throw new Error("Backend-Antwort konnte nicht geparst werden.");
    return parsed.data;
  }

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setErr(null);
    setInfo(null);
    setBusy(true);
    setProgress({ done: 0, total: arr.length });

    const added: RentalUnitImageT[] = [];
    let failed = 0;
    let firstError: string | null = null;

    for (let i = 0; i < arr.length; i++) {
      try {
        const img = await uploadOne(arr[i]);
        added.push(img);
      } catch (e) {
        failed++;
        if (!firstError) firstError = e instanceof Error ? e.message : "Fehler";
      }
      setProgress({ done: i + 1, total: arr.length });
    }
    setImages((prev) => [...prev, ...added]);
    if (failed > 0 && firstError) {
      setErr(`${failed} von ${arr.length} fehlgeschlagen: ${firstError}`);
    } else if (added.length > 0) {
      setInfo(`${added.length} Bild${added.length === 1 ? "" : "er"} hochgeladen.`);
    }
    setBusy(false);
    setProgress(null);
    if (fileInput.current) fileInput.current.value = "";
    if (added.length > 0) router.refresh();
  }

  async function deleteImage(img: RentalUnitImageT) {
    if (!confirm(`Bild "${img.alt ?? "ohne Beschriftung"}" löschen?`)) return;
    setErr(null);
    try {
      const r = await apiFetch(`/me/rental-units/${unitId}/images/${img.id}`, {
        method: "DELETE"
      });
      if (!r.ok) throw new Error(`Fehler ${r.status}`);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Fehler");
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <Card title={`Bilder (${images.length})`}>
      {/* Upload-Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-indigo-400 bg-indigo-50"
            : "border-zinc-300 bg-zinc-50"
        }`}
      >
        <div className="text-sm text-zinc-700">
          <span className="font-semibold">Bilder hierher ziehen</span> oder Datei auswählen
        </div>
        <div className="text-xs text-zinc-500">
          JPG / PNG / WEBP bis 4 MB. Mehrere Dateien gleichzeitig möglich.
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadFiles(e.target.files);
            }
          }}
          className="text-xs text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
        />
        {progress ? (
          <div className="w-full max-w-xs">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{
                  width: `${(progress.done / progress.total) * 100}%`
                }}
              />
            </div>
            <div className="mt-1 text-[10px] text-zinc-500">
              {progress.done} / {progress.total}
            </div>
          </div>
        ) : null}
        {err ? <div className="text-xs text-rose-600">{err}</div> : null}
        {info ? <div className="text-xs text-emerald-700">{info}</div> : null}
      </div>

      {/* Galerie */}
      {images.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-white p-4 text-center text-xs text-zinc-500">
          Noch keine Bilder. Lade Wohnungsbilder hoch — das erste Bild wird
          automatisch zum Cover.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? ""}
                className="aspect-[4/3] w-full cursor-zoom-in object-cover transition group-hover:opacity-95"
                onClick={() => setPreviewIdx(idx)}
              />
              {idx === 0 ? (
                <span className="absolute left-2 top-2 rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
                  Cover
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => deleteImage(img)}
                disabled={busy}
                className="absolute right-2 top-2 rounded-md border border-rose-200 bg-white/95 px-2 py-1 text-[10px] font-semibold text-rose-600 opacity-0 shadow transition group-hover:opacity-100 hover:bg-rose-50 disabled:opacity-50"
              >
                Löschen
              </button>
              {img.alt ? (
                <div className="truncate px-2 py-1 text-[10px] text-zinc-500">
                  {img.alt}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {previewIdx != null && images[previewIdx] ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewIdx(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[previewIdx].url}
            alt={images[previewIdx].alt ?? ""}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
          <button
            type="button"
            onClick={() => setPreviewIdx(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-800 shadow"
          >
            Schließen
          </button>
          {previewIdx > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIdx(previewIdx - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-zinc-800 shadow"
            >
              ←
            </button>
          ) : null}
          {previewIdx < images.length - 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIdx(previewIdx + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-zinc-800 shadow"
            >
              →
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
