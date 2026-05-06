"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";

export function PropertyActions({ id }: { id: string }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [busy, setBusy] = useState<null | "analyze" | "offer" | "delete">(null);

  async function run(kind: "analyze" | "offer") {
    setBusy(kind);
    try {
      const path = kind === "analyze" ? `/analyze/${id}` : `/offer/${id}`;
      const res = await apiFetch(path, { method: "POST" });
      if (!res.ok) throw new Error(`Request fehlgeschlagen (${res.status})`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    if (!confirm("Dieses Objekt inkl. Analyse, Angebot und Notizen unwiderruflich löschen?")) return;
    setBusy("delete");
    try {
      const res = await apiFetch(`/properties/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`DELETE fehlgeschlagen (${res.status})`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() => run("analyze")}
        disabled={busy !== null}
        title="Erzeugt einen neuen Analyse-Snapshot mit Standard-Annahmen"
      >
        {busy === "analyze" ? "Analysiere…" : "Analysieren"}
      </Button>
      <Button
        onClick={() => run("offer")}
        disabled={busy !== null}
        title="Erzeugt Preisvorschlag und Nachricht via Claude"
      >
        {busy === "offer" ? "Generiere…" : "Angebot generieren"}
      </Button>
      <Button
        variant="ghost"
        onClick={onDelete}
        disabled={busy !== null}
        title="Property löschen"
      >
        {busy === "delete" ? "Lösche…" : "Löschen"}
      </Button>
    </div>
  );
}
