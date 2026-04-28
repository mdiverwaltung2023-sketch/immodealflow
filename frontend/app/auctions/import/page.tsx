"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

type Mode = "text" | "pdf" | "url" | "list";

const LIST_EXAMPLES: { label: string; url: string }[] = [
  { label: "DGA Auktionsübersicht", url: "https://www.dga-ag.de/auktionen" },
  { label: "SDL Auktionsübersicht", url: "https://www.sdl-auktion.de/auktionen" },
  { label: "Karhausen Termine", url: "https://www.karhausen.de/auktionen/" }
];

export default function AuctionImportPage() {
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [listUrl, setListUrl] = useState("");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listResult, setListResult] = useState<{
    imported: number;
    skipped: number;
    detectedType: string;
    message?: string;
  } | null>(null);

  function onPdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPdfBase64(null);
      setPdfName(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setPdfBase64(result);
      setPdfName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function submitSingle() {
    if (!api) return;
    setError(null);

    let body: Record<string, string> = {};
    if (mode === "text") {
      if (text.trim().length < 20) {
        setError("Bitte mehr Text einfügen (mind. 20 Zeichen).");
        return;
      }
      body = { text };
    } else if (mode === "pdf") {
      if (!pdfBase64) {
        setError("Bitte ein PDF auswählen.");
        return;
      }
      body = { pdfBase64 };
    } else if (mode === "url") {
      if (!/^https?:\/\//.test(url)) {
        setError("Bitte eine vollständige URL angeben (https://…).");
        return;
      }
      body = { url };
    }

    setBusy(true);
    try {
      const res = await fetch(`${api.replace(/\/+$/, "")}/import/auction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Import fehlgeschlagen (${res.status}) ${txt}`);
      }
      const property = (await res.json()) as { id: string };
      router.push(`/property/${property.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function submitList() {
    if (!api) return;
    setError(null);
    setListResult(null);

    if (!/^https?:\/\//.test(listUrl)) {
      setError("Bitte eine vollständige URL angeben (https://…).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${api.replace(/\/+$/, "")}/import/auction-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: listUrl })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Listen-Import fehlgeschlagen (${res.status}) ${txt}`);
      }
      const data = (await res.json()) as {
        imported: number;
        skipped: number;
        detectedType: string;
        message?: string;
      };
      setListResult(data);
      if (data.imported > 0) {
        // kurzer Banner zeigen, dann zurück zur Übersicht
        setTimeout(() => router.push("/auctions"), 2500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Versteigerung importieren</div>
          <div className="mt-1 text-sm text-zinc-400">
            ZVG-Bekanntmachung, DGA-/SDL-Katalogseite oder andere Auktionstermine importieren. Claude extrahiert die Eckdaten und berechnet dein Bietlimit.
          </div>
        </div>
        <Link href="/auctions" className="text-sm text-zinc-300 hover:underline">
          ← Zur Übersicht
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <ModeTab active={mode === "text"} onClick={() => setMode("text")}>Bekanntmachung als Text</ModeTab>
        <ModeTab active={mode === "pdf"} onClick={() => setMode("pdf")}>PDF hochladen</ModeTab>
        <ModeTab active={mode === "url"} onClick={() => setMode("url")}>URL einfügen (einzeln)</ModeTab>
        <ModeTab active={mode === "list"} onClick={() => setMode("list")}>Liste importieren (DGA/SDL)</ModeTab>
      </div>

      {mode !== "list" ? (
        <Card title="Eingabe">
          {mode === "text" ? (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                Kopiere den Text einer ZVG-Bekanntmachung (von <a className="underline" href="https://www.zvg-portal.de" target="_blank" rel="noreferrer">zvg-portal.de</a>) oder eines Auktionskatalogs hier hinein.
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Bekanntmachungs-Text einfügen …"
                className="min-h-[260px]"
              />
            </div>
          ) : null}

          {mode === "pdf" ? (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                Lade die PDF-Bekanntmachung hoch (z. B. von zvg-portal.de). Wir extrahieren den Text lokal und schicken ihn dann an Claude.
              </div>
              <div>
                <Label>PDF-Datei</Label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={onPdfChange}
                  className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-2 file:text-zinc-200 hover:file:bg-zinc-800"
                />
                {pdfName ? <div className="mt-2 text-xs text-zinc-400">Ausgewählt: {pdfName}</div> : null}
              </div>
            </div>
          ) : null}

          {mode === "url" ? (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                Direktlink zu **einem** Termin / einer Bekanntmachung. Funktioniert für PDFs und HTML-Seiten ohne aktive Bot-Sperre (z. B. zvg-portal.de, einzelne DGA-/SDL-Detailseiten).
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.zvg-portal.de/…"
              />
            </div>
          ) : null}

          {error ? <div className="mt-3 text-sm text-rose-400">{error}</div> : null}

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={submitSingle} disabled={busy}>
              {busy ? "Importiere…" : "Importieren & Bietlimit berechnen"}
            </Button>
            <Link href="/auctions" className="text-sm text-zinc-300 hover:underline">
              Abbrechen
            </Link>
          </div>
        </Card>
      ) : (
        <Card title="Auktions-Liste / Katalog importieren">
          <div className="space-y-4">
            <div className="text-xs text-zinc-400">
              URL einer Übersichts-/Katalogseite eingeben — DealFlow holt die Seite, Claude extrahiert die Liste der Auktionen, alle werden als Properties mit `dealType=AUCTION` angelegt. Funktioniert für DGA, SDL, Karhausen und ähnliche Anbieter ohne aktive Bot-Sperre.
            </div>

            <div>
              <Label>Beispiel-Quellen (zum Klicken)</Label>
              <div className="flex flex-wrap gap-2">
                {LIST_EXAMPLES.map((ex) => (
                  <button
                    key={ex.url}
                    type="button"
                    onClick={() => setListUrl(ex.url)}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Übersichts-URL</Label>
              <Input
                value={listUrl}
                onChange={(e) => setListUrl(e.target.value)}
                placeholder="https://www.dga-ag.de/auktionen"
              />
            </div>

            {error ? <div className="text-sm text-rose-400">{error}</div> : null}

            {listResult ? (
              <div className="rounded-xl border bg-zinc-950 p-4 text-sm">
                <div className="font-semibold text-emerald-300">
                  {listResult.imported} Auktionen importiert
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  Erkannter Typ: {listResult.detectedType}
                  {listResult.skipped > 0 ? ` · ${listResult.skipped} übersprungen` : ""}
                </div>
                {listResult.message ? (
                  <div className="mt-2 text-xs text-zinc-300">{listResult.message}</div>
                ) : null}
                {listResult.imported > 0 ? (
                  <div className="mt-2 text-xs text-zinc-400">Wechsle zur Übersicht …</div>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Button onClick={submitList} disabled={busy}>
                {busy ? "Lade & extrahiere …" : "Liste importieren"}
              </Button>
              <Link href="/auctions" className="text-sm text-zinc-300 hover:underline">
                Abbrechen
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-indigo-500 bg-indigo-500/10 text-white"
          : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
