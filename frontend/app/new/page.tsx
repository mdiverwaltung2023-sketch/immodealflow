"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { ImportExposeResponseSchema } from "@/lib/api";
import { useApiFetch } from "@/lib/client-fetch";

const Schema = z.object({
  title: z.string().min(1),
  price: z.number().int().positive(),
  rent: z.number().int().nonnegative(),
  location: z.string().min(1),
  size: z.number().positive()
});

function toNumber(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export default function NewPropertyPage() {
  const router = useRouter();
  const apiFetch = useApiFetch();

  const [form, setForm] = useState({
    title: "",
    price: "",
    rent: "",
    location: "",
    size: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Import-State
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);

  const parsed = useMemo(() => {
    return Schema.safeParse({
      title: form.title,
      price: toNumber(form.price),
      rent: toNumber(form.rent),
      location: form.location,
      size: toNumber(form.size)
    });
  }, [form]);

  async function runImport() {
    if (importText.trim().length < 20) {
      setImportNote("Bitte mehr Inserat-Text einfügen (mind. 20 Zeichen).");
      return;
    }
    setImportNote(null);
    setImportBusy(true);
    try {
      const res = await apiFetch(`/import/expose`, {
        method: "POST",
        body: JSON.stringify({ text: importText })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Import fehlgeschlagen (${res.status}) ${txt}`);
      }
      const data = ImportExposeResponseSchema.parse(await res.json());
      setForm({
        title: data.title,
        price: String(data.price),
        rent: String(data.rent),
        location: data.location,
        size: String(data.size)
      });
      const conf = data.confidence ? ` Konfidenz: ${data.confidence}.` : "";
      const notes = data.notes ? ` Hinweis: ${data.notes}` : "";
      setImportNote(`Übernommen.${conf}${notes} Bitte Werte prüfen.`);
      setShowImport(false);
    } catch (e) {
      setImportNote(e instanceof Error ? e.message : "Fehler");
    } finally {
      setImportBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!parsed.success) {
      setError("Bitte prüfe deine Eingaben.");
      return;
    }

    setBusy(true);
    try {
      const res = await apiFetch(`/properties`, {
        method: "POST",
        body: JSON.stringify(parsed.data)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Speichern fehlgeschlagen (${res.status}) ${txt}`);
      }
      const json = (await res.json()) as { id: string };
      router.push(`/property/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Neues Objekt</div>
        <div className="mt-1 text-sm text-zinc-400">
          Lege ein Objekt an. Danach kannst du analysieren und ein Angebot generieren.
        </div>
      </div>

      <Card title="Schnell-Import aus Inserat">
        <div className="space-y-3">
          <div className="text-xs text-zinc-400">
            Kopiere den Inserats-Text (z. B. von Immoscout24, Immowelt, eBay-Kleinanzeigen)
            und Claude extrahiert Titel, Preis, Miete, Lage und Größe automatisch.
          </div>
          {!showImport ? (
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              Aus Inserat-Text importieren …
            </Button>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Inserat-Text hier einfügen …"
                className="min-h-[180px]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={runImport} disabled={importBusy}>
                  {importBusy ? "Extrahiere…" : "Felder extrahieren"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowImport(false);
                    setImportText("");
                    setImportNote(null);
                  }}
                  disabled={importBusy}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
          {importNote ? <div className="text-sm text-zinc-300">{importNote}</div> : null}
        </div>
      </Card>

      <Card title="Property anlegen">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Titel</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="z.B. 2-Zimmer Wohnung, Balkon"
              />
            </div>
            <div>
              <Label>Lage</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="z.B. Berlin, Prenzlauer Berg"
              />
            </div>
            <div>
              <Label>Preis (EUR)</Label>
              <Input
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="250000"
              />
            </div>
            <div>
              <Label>Miete (EUR/Monat)</Label>
              <Input
                inputMode="numeric"
                value={form.rent}
                onChange={(e) => setForm((f) => ({ ...f, rent: e.target.value }))}
                placeholder="950"
              />
            </div>
            <div>
              <Label>Größe (m²)</Label>
              <Input
                inputMode="decimal"
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                placeholder="62.5"
              />
            </div>
          </div>

          {error ? <div className="text-sm text-rose-400">{error}</div> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={busy || !parsed.success}>
              {busy ? "Speichere…" : "Objekt anlegen"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => history.back()} disabled={busy}>
              Abbrechen
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
