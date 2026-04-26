"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function PropertyActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "analyze" | "offer">(null);
  const api = process.env.NEXT_PUBLIC_API_BASE_URL;

  async function run(kind: "analyze" | "offer") {
    if (!api) {
      alert("NEXT_PUBLIC_API_BASE_URL fehlt");
      return;
    }
    setBusy(kind);
    try {
      const path = kind === "analyze" ? `/analyze/${id}` : `/offer/${id}`;
      const res = await fetch(`${api.replace(/\\/+$/, "")}${path}`, { method: "POST" });
      if (!res.ok) throw new Error(`Request fehlgeschlagen (${res.status})`);
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
        title="Berechnet Rendite, Cashflow und Score"
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
    </div>
  );
}

