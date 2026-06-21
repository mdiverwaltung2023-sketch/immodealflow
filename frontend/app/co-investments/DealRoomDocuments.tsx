"use client";

import { useEffect, useState } from "react";
import { useApiFetch } from "@/lib/client-fetch";
import { CoInvestDocumentsResponseSchema, type CoInvestDocumentT } from "@/lib/api";

function fmtSize(n: number | null | undefined): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DealRoomDocuments({ interestId }: { interestId: string }) {
  const apiFetch = useApiFetch();
  const [docs, setDocs] = useState<CoInvestDocumentT[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch(`/me/coinvest-interests/${interestId}/documents`);
      if (!res.ok) return;
      const parsed = CoInvestDocumentsResponseSchema.parse(await res.json());
      setDocs(parsed.documents);
    } catch {
      /* tolerant */
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestId]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload-file", { method: "POST", body: fd });
      const data = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(data?.error || `Upload fehlgeschlagen (${up.status})`);
      const reg = await apiFetch(`/me/coinvest-interests/${interestId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, url: data.url, mimeType: data.type || null, size: data.size ?? null })
      });
      if (!reg.ok) throw new Error(await reg.text());
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function remove(docId: string) {
    setErr(null);
    try {
      const res = await apiFetch(`/me/coinvest-interests/${interestId}/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">Dokumente</div>
          <div className="text-sm text-slate-600">Geteilte Unterlagen — nur für euch beide sichtbar.</div>
        </div>
        <label className="inline-block cursor-pointer rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
          {uploading ? "Lädt …" : "+ Datei"}
          <input type="file" className="hidden" onChange={onPick} disabled={uploading}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip" />
        </label>
      </div>

      <ul className="divide-y divide-slate-100">
        {docs.length === 0 ? (
          <li className="px-5 py-6 text-center text-xs text-slate-400">
            Noch keine Dokumente. Teile Exposé, Kalkulation, Grundbuchauszug o. Ä.
          </li>
        ) : (
          docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm text-slate-800 hover:text-teal-700">
                <svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M14 3v5h5" /><path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z" />
                </svg>
                <span className="truncate font-medium">{d.name}</span>
                {d.size ? <span className="shrink-0 text-xs text-slate-400">· {fmtSize(d.size)}</span> : null}
              </a>
              {d.mine && (
                <button onClick={() => remove(d.id)} className="shrink-0 text-xs text-slate-400 hover:text-red-500">
                  entfernen
                </button>
              )}
            </li>
          ))
        )}
      </ul>
      {err && <div className="border-t border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">{err}</div>}
    </div>
  );
}
