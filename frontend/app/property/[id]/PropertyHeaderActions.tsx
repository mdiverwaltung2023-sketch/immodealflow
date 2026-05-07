"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";

export function PropertyHeaderActions({ id }: { id: string }) {
  const router = useRouter();
  const apiFetch = useApiFetch();

  async function onDelete() {
    if (!confirm("Dieses Objekt inkl. Analyse, Angebot und Notizen unwiderruflich löschen?")) return;
    try {
      const res = await apiFetch(`/properties/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`DELETE fehlgeschlagen (${res.status})`);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Fehler");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/property/${id}/edit`}
        className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Bearbeiten
      </Link>
      <Button variant="danger" onClick={onDelete}>
        Löschen
      </Button>
    </div>
  );
}
