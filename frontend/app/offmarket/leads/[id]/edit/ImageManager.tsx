"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { z } from "zod";
import { OffmarketImageSchema, type OffmarketImageT } from "@/lib/api";
import { OffmarketImage } from "@/components/OffmarketImage";

// HARDCODED — bypasses any env-var Verwirrung
const API_BASE = "https://api.infinityoikos.com";

const ListSchema = z.array(OffmarketImageSchema);

export function ImageManager({ leadId }: { leadId: string }) {
  const { getToken } = useAuth();
  const [images, setImages] = useState<OffmarketImageT[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stylizingId, setStylizingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [debug, setDebug] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE}/me/offmarket-leads/${leadId}/images`, {
        headers
      });
      if (!res.ok) return;
      const json = await res.json();
      setImages(ListSchema.parse(json));
    } catch {
      /* tolerant */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (images.some((i) => !i.blurredUrl)) load();
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, images.length]);

  async function uploadFile(file: File) {
    setErr(null);
    setDebug(`API_BASE = ${API_BASE}`);
    setUploading(true);
    try {
      // Schritt 1: Datei direkt zum Backend per multipart hochladen
      // (alternative zum Frontend /api/upload-image; vermeidet Vercel-Route).
      const headers = await authHeaders();
      const form = new FormData();
      form.append("file", file);
      form.append("filename", file.name);

      // Wir nutzen weiterhin die Frontend-Route /api/upload-image,
      // weil sie zu Vercel Blob hochlaedt (Backend hat keine Blob-Auth).
      // Falls die Route 404 gibt -> Fallback: Vercel-Blob-Upload direkt
      // ueber den /me/.../images-Endpoint, der dann auch Blob hochlaedt.
      const upRes = await fetch("/api/upload-image", {
        method: "POST",
        body: form
      });

      let uploadedUrl: string | null = null;
      if (upRes.ok) {
        const j = (await upRes.json()) as { url: string };
        uploadedUrl = j.url;
        setDebug(`API_BASE = ${API_BASE} | Upload via /api/upload-image OK`);
      } else {
        // Fallback: Direkt zum Backend mit multipart-Form
        setDebug(
          `API_BASE = ${API_BASE} | /api/upload-image gab ${upRes.status} — versuche Backend-Direkt-Upload`
        );
        const directRes = await fetch(
          `${API_BASE}/me/offmarket-leads/${leadId}/images/upload`,
          { method: "POST", headers, body: form }
        );
        if (!directRes.ok) {
          throw new Error(
            `Beide Upload-Wege fehlgeschlagen: /api/upload-image=${upRes.status}, Backend=${directRes.status}`
          );
        }
        const j = (await directRes.json()) as { url: string };
        uploadedUrl = j.url;
      }

      if (!uploadedUrl) throw new Error("Upload lieferte keine URL");

      // Schritt 2: URL im Backend registrieren
      const regRes = await fetch(
        `${API_BASE}/me/offmarket-leads/${leadId}/images`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ originalUrl: uploadedUrl, alt: file.name })
        }
      );
      if (!regRes.ok) {
        const t = await regRes.text();
        throw new Error(
          `Registrierung fehlgeschlagen (${regRes.status}) bei ${API_BASE}/me/offmarket-leads/${leadId}/images: ${t.slice(0, 200)}`
        );
      }
      await load();
    } catch (e) {
      setErr((e as Error).message || "Upload-Fehler");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 4 * 1024 * 1024) {
        setErr(`${f.name}: max. 4 MB`);
        continue;
      }
      await uploadFile(f);
    }
  }

  async function remove(imageId: string) {
    if (!confirm("Bild wirklich löschen?")) return;
    const headers = await authHeaders();
    await fetch(`${API_BASE}/me/offmarket-leads/${leadId}/images/${imageId}`, {
      method: "DELETE",
      headers
    });
    await load();
  }

  async function stylize(imageId: string) {
    setStylizingId(imageId);
    setErr(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE}/me/offmarket-leads/${leadId}/images/${imageId}/stylize`,
        { method: "POST", headers }
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Stilisierung fehlgeschlagen (${res.status})`);
      }
      await load();
    } catch (e) {
      setErr((e as Error).message || "Stilisierung fehlgeschlagen");
    } finally {
      setStylizingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Bilder (anonymisiert)
            </h2>
            <p className="mt-0.5 text-xs text-zinc-600">
              Original wird automatisch zu einer Blur-Variante verarbeitet.
              Diese wird Investoren angezeigt. Original sieht der Investor
              erst nach Doppel-Freigabe. Optional: KI-Aquarell-Variante per
              Klick generieren.
            </p>
          </div>
          <label className="cursor-pointer rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700">
            {uploading ? "Lädt..." : "+ Bild hochladen"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onPick}
              disabled={uploading}
            />
          </label>
        </div>

        {debug && (
          <div className="mt-2 rounded bg-zinc-50 px-2 py-1 text-[10px] font-mono text-zinc-500">
            Debug: {debug}
          </div>
        )}

        {err && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 whitespace-pre-wrap break-all">
            {err}
          </div>
        )}

        {images.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-xs text-zinc-500">
            Noch keine Bilder. Foto hochladen — wir verpixeln es automatisch
            und erzeugen auf Wunsch eine Aquarell-Version per KI.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {images.map((img) => (
              <div key={img.id} className="space-y-2">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <OffmarketImage image={img} mode="full" className="h-full" />
                  <button
                    type="button"
                    onClick={() => remove(img.id)}
                    className="absolute right-2 top-2 rounded-full bg-zinc-900/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur hover:bg-red-600/80"
                  >
                    ✕
                  </button>
                </div>
                <div className="aspect-[4/3] overflow-hidden rounded-xl">
                  <OffmarketImage image={img} mode="anon" className="h-full" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Badge
                      ok={!!img.blurredUrl}
                      label="Blur"
                      pending={!img.blurredUrl}
                    />
                    <Badge ok={!!img.stylizedUrl} label="KI-Aquarell" />
                  </div>
                  {!img.stylizedUrl && (
                    <button
                      type="button"
                      disabled={stylizingId === img.id}
                      onClick={() => stylize(img.id)}
                      className="w-full rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-2 py-1.5 text-[11px] font-semibold text-white shadow-sm disabled:opacity-50"
                    >
                      {stylizingId === img.id
                        ? "KI generiert (15-30s)..."
                        : "✨ Aquarell-Version generieren"}
                    </button>
                  )}
                  {img.caption && (
                    <div className="rounded bg-amber-50 px-2 py-1 text-[10px] italic text-amber-900">
                      Caption: "{img.caption}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({
  ok,
  label,
  pending
}: {
  ok: boolean;
  label: string;
  pending?: boolean;
}) {
  if (ok) return <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">✓ {label}</span>;
  if (pending) return <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700">⏳ {label} läuft...</span>;
  return <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-zinc-500">{label} —</span>;
}
