"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiFetch } from "@/lib/client-fetch";
import {
  ASSET_TYPE_LABELS,
  INQUIRY_STATUS_LABELS,
  PROFILE_VISIBILITY_LABELS,
  TRACKRECORD_ROLE_LABELS,
  type SellerInquiryT
} from "@/lib/api";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(n);
}

function affordability(p: { equity?: number | null; monthlyIncome?: number | null; monthlyDebt?: number | null }) {
  if (p.monthlyIncome == null) return null;
  const cap = p.monthlyIncome * 0.4;
  const dms = Math.max(0, Math.round(cap - (p.monthlyDebt ?? 0)));
  const factor = 0.058 / 12;
  const maxLoan = Math.round(dms / factor);
  const maxInv = maxLoan + (p.equity ?? 0);
  return { maxLoan, maxInv };
}

export function InquiryRow({
  inquiry,
  listingTitle
}: {
  inquiry: SellerInquiryT;
  listingTitle: string;
}) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<"accept" | "reject" | null>(null);

  const investor = inquiry.investor;
  const profile = investor?.investorProfile ?? null;
  const tr = investor?.trackrecordItems ?? [];
  const aff = profile ? affordability(profile) : null;

  async function respond(status: "ACCEPTED" | "REJECTED") {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/me/inquiries/${inquiry.id}/respond`, {
        method: "PATCH",
        body: JSON.stringify({ status, response: response.trim() || null })
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fehlgeschlagen (${res.status}) ${txt.slice(0, 200)}`);
      }
      setOpen(null);
      setResponse("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-white">
              {investor?.name ?? "Anonymer Investor"}
            </div>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300">
              {INQUIRY_STATUS_LABELS[inquiry.status]}
            </span>
            {profile?.financingPreApproved ? (
              <span className="rounded-full border border-emerald-900 bg-emerald-950/40 px-2 py-0.5 text-[10px] text-emerald-200">
                Finanzierung vorab bestätigt
              </span>
            ) : null}
            {profile?.visibility ? (
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                Profil: {PROFILE_VISIBILITY_LABELS[profile.visibility]}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            Anfrage am {new Date(inquiry.createdAt).toLocaleString("de-DE")}
            {inquiry.respondedAt
              ? ` • Beantwortet am ${new Date(inquiry.respondedAt).toLocaleString("de-DE")}`
              : ""}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-100">
        <div className="text-xs uppercase tracking-wide text-zinc-400">Nachricht</div>
        <div className="mt-1 whitespace-pre-wrap">{inquiry.message}</div>
      </div>

      {/* Profil-Auszug */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Profil</div>
          <div className="mt-1 text-xs text-zinc-200">
            {profile?.bio ? profile.bio : <span className="text-zinc-500">Kein Bio.</span>}
          </div>
          <div className="mt-2 text-[10px] text-zinc-500">
            Erfahrung: {profile?.investmentExperienceYears ?? 0} Jahre
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Bonität</div>
          <div className="mt-1 text-xs text-zinc-200">EK: {eur(profile?.equity)}</div>
          <div className="text-xs text-zinc-200">Einkommen/Mon.: {eur(profile?.monthlyIncome)}</div>
          {aff ? (
            <div className="mt-2 text-[10px] text-zinc-400">
              Max. Darlehen ≈ {eur(aff.maxLoan)}
              <br />
              Max. Investition ≈ {eur(aff.maxInv)}
            </div>
          ) : (
            <div className="mt-2 text-[10px] text-zinc-500">Keine Bonität angegeben.</div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Trackrecord ({tr.length})</div>
          {tr.length === 0 ? (
            <div className="mt-1 text-xs text-zinc-500">Keine Einträge.</div>
          ) : (
            <ul className="mt-1 space-y-1 text-[11px] text-zinc-300">
              {tr.slice(0, 4).map((t) => (
                <li key={t.id}>
                  {t.year} • {ASSET_TYPE_LABELS[t.type]} • {TRACKRECORD_ROLE_LABELS[t.role]} • {t.location}
                  {t.value ? ` • ${eur(t.value)}` : ""}
                </li>
              ))}
              {tr.length > 4 ? (
                <li className="text-zinc-500">... +{tr.length - 4} weitere</li>
              ) : null}
            </ul>
          )}
        </div>
      </div>

      {/* Antwort vom Verkäufer (wenn schon beantwortet) */}
      {inquiry.response ? (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Deine Antwort</div>
          <div className="mt-1 whitespace-pre-wrap text-zinc-200">{inquiry.response}</div>
        </div>
      ) : null}

      {/* Aktionen — nur bei PENDING */}
      {inquiry.status === "PENDING" ? (
        <div className="mt-4 space-y-3">
          {open ? (
            <div className="space-y-2">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder={
                  open === "accept"
                    ? "Optional: Begleitnachricht — z. B. Termin-Vorschlag oder weitere Unterlagen"
                    : "Optional: kurze Begründung der Absage"
                }
                rows={3}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
              />
              {error ? <div className="text-xs text-rose-300">{error}</div> : null}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => respond(open === "accept" ? "ACCEPTED" : "REJECTED")}
                  disabled={busy}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${
                    open === "accept"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-rose-500 hover:bg-rose-600"
                  }`}
                >
                  {busy ? "Sende…" : open === "accept" ? "Annehmen bestätigen" : "Ablehnen bestätigen"}
                </button>
                <button
                  onClick={() => {
                    setOpen(null);
                    setResponse("");
                    setError(null);
                  }}
                  disabled={busy}
                  className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-700"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOpen("accept")}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
              >
                Annehmen
              </button>
              <button
                onClick={() => setOpen("reject")}
                className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:border-rose-500 hover:text-rose-300"
              >
                Ablehnen
              </button>
              <span className="text-[10px] text-zinc-500">
                Bei Annahme wird das Listing automatisch auf „In Verhandlung" gesetzt und die
                Adresse für den Investor freigegeben.
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
