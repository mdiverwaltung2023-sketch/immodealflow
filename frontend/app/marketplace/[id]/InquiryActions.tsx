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
  const [paywall, setPaywall] = useState<{ message: string; upgradeTo: "INVESTOR_PRO" | "SELLER_PRO" } | null>(null);

  // Verkäufer sieht keine Anfrage-Aktion auf eigenes Listing
  if (isOwner) {
    return (
      <div className="space-y-3 text-sm text-zinc-600">
        <div>Du bist der Verkäufer dieses Listings.</div>
        <Link
          href={`/listings/${listingId}/inquiries`}
          className="inline-block rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
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
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Deine Anfrage ist <span className="font-semibold">offen</span> und wartet auf Antwort
            des Verkäufers.
          </div>
          <Link
            href={`/inquiries/${myInquiry.id}`}
            className="inline-block rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Anfrage ansehen
          </Link>
        </div>
      );
    }
    if (myInquiry.status === "ACCEPTED") {
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Deine Anfrage wurde <span className="font-semibold">angenommen</span>. Vollständige
            Adresse und Verkäufer-Kontakt sind freigegeben.
          </div>
          <Link
            href={`/inquiries/${myInquiry.id}`}
            className="inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
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
      <div className="text-sm text-zinc-500">
        Dieses Listing ist {listingStatus === "IN_NEGOTIATION" ? "bereits in Verhandlung" : "nicht aktiv"}.
        Anfragen sind aktuell nicht möglich.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPaywall(null);
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
      // Pay-Wall: Backend liefert 402 mit strukturiertem paywall-Body
      if (res.status === 402) {
        const data = (await res.json().catch(() => null)) as {
          paywall?: { message: string; upgradeTo: "INVESTOR_PRO" | "SELLER_PRO" };
        } | null;
        if (data?.paywall) {
          setPaywall(data.paywall);
          return;
        }
      }
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
        <div className="text-sm text-zinc-600">
          Wenn du anfragst, sieht der Verkäufer dein Investor-Profil (Bonität, Trackrecord, Präferenzen).
          Bei einer Annahme wird die vollständige Adresse für dich freigegeben.
        </div>
        <Button onClick={() => setOpen(true)}>Anfrage stellen</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {paywall ? (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2.5">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-amber-900">Anfrage-Limit erreicht</div>
              <div className="mt-1 text-xs text-amber-800">{paywall.message}</div>
              <Link
                href="/pricing"
                className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Investor Pro freischalten →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Z. B. Interesse bestätigt — frage nach Verkaufsexposé, Mieterliste und Energieausweis. Verfügbarkeit für Besichtigung Mo–Mi nächste Woche."
        className="min-h-[140px]"
      />
      <div className="text-xs text-zinc-500">
        {message.length} Zeichen — mindestens 10, höchstens 4000.
      </div>
      {error ? <div className="text-xs text-rose-600">{error}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy || paywall !== null}>
          {busy ? "Sende…" : "Anfrage absenden"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setMessage("");
            setError(null);
            setPaywall(null);
          }}
          disabled={busy}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
