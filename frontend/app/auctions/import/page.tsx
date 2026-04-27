"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

type Mode = "text" | "pdf" | "url";

export default function AuctionImportPage() {
  const router = useRouter();
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function submit() {
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
    } else {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Versteigerung importieren</div>
          <div className="mt-1 text-sm text-zinc-400">
            ZVG-Bekanntmachung, DGA-/SDL-Katalogseite oder anderen Auktionstermin importieren. Claude extrahiert die Eckdaten und berechnet dein Bietlimit.
          </div>
        </div>
        <Link href="/auctions" className="text-sm text-zinc-300 hover:underline">
          ← Zur Übersicht
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <ModeTab active={mode === "text"} onClick={() => setMode("text")}>Bekanntmachung als Text</ModeTab>
        <ModeTab active={mode === "pdf"} onClick={() => setMode("pdf")}>PDF hochladen</ModeTab>
        <ModeTab active={mode === "url"} onClick={() => setMode("url")}>URL einfügen</ModeTab>
      </div>

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
              Direktlink zum Termin / zur Bekanntmachung. Funktioniert für PDFs und HTML-Seiten ohne aktive Bot-Sperre (z. B. zvg-portal.de, DGA, SDL).
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
          <Button onClick={submit} disabled={busy}>
            {busy ? "Importiere…" : "Importieren & Bietlimit berechnen"}
          </Button>
          <Link
            href="/auctions"
            className="text-sm text-zinc-300 hover:underline"
          >
            Abbrechen
          </Link>
        </div>
      </Card>
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
