"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Textarea } from "@/components/ui";
import { useApiFetch } from "@/lib/client-fetch";
import { INQUIRY_STATUS_LABELS, type InquiryStatusT } from "@/lib/api";

type MyInquiry = {
  id: string;
  status: InquiryStatusT;
  createdAt: string;
} | null;

export function InquiryActions({
  listingId,
  isOwner,
  listingStatus,
  myInquiry
}: {
  listingId: string;
  isOwner: boolean;
  listingStatus: string;
  myInquiry: MyInquiry;
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verkäufer sieht keine Anfrage-Aktion auf eigenes Listing
  if (isOwner) {
    return (
      <div className="space-y-3 text-sm text-zinc-300">
        <div>Du bist der Verkäufer dieses Listings.</div>
        <Link
          href={`/listings/${listingId}/inquiries`}
          className="inline-block rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-600"
        >
          Anfragen ansehen
        </Link>
      </div>
    );
  }

  if (myInquiry) {
    if (myInquiry.status === "PENDING") {
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-100">
            Deine Anfrage ist <span className="font-semibold">offen</span> und wartet auf Antwort
            des Verkäufers.
          </div>
          <Link
            href={`/inquiries/${myInquiry.id}`}
            className="inline-block rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
          >
            Anfrage ansehen
          </Link>
        </div>
      );
    }
    if (myInquiry.status === "ACCEPTED") {
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-100">
            Deine Anfrage wurde <span className="font-semibold">angenommen</span>. Vollständige
            Adresse und Verkäufer-Kontakt sind freigegeben.
          </div>
          <Link
            href={`/inquiries/${myInquiry.id}`}
            className="inline-block rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600"
          >
            Details ansehen
          </Link>
        </div>
      );
    }
  }

  // Listings, die nicht ACTIVE sind, können nicht angefragt werden
  if (listingStatus !== "ACTIVE") {
    return (
      <div className="text-sm text-zinc-400">
        Dieses Listing ist {listingStatus === "IN_NEGOTIATION" ? "bereits in Verhandlung" : "nicht aktiv"}.
        Anfragen sind aktuell nicht möglich.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (message.trim().length < 10) {
      setError("Bitte mindestens 10 Zeichen Nachricht.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch("/me/inquiries", {
        method: "POST",
        body: JSON.stringify({ listingId, message: message.trim() })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Anfrage fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      setOpen(false);
      setMessage("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-zinc-300">
          Wenn du anfragst, sieht der Verkäufer dein Investor-Profil (Bonität, Trackrecord, Präferenzen).
          Bei einer Annahme wird die vollständige Adresse für dich freigegeben.
        </div>
        <Button onClick={() => setOpen(true)}>Anfrage stellen</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Z. B. Interesse bestätigt — frage nach Verkaufsexposé, Mieterliste und Energieausweis. Verfügbarkeit für Besichtigung Mo–Mi nächste Woche."
        className="min-h-[140px]"
      />
      <div className="text-xs text-zinc-500">
        {message.length} Zeichen — mindestens 10, höchstens 4000.
      </div>
      {error ? <div className="text-xs text-rose-300">{error}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Sende…" : "Anfrage absenden"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setMessage("");
            setError(null);
          }}
          disabled={busy}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
