"use client";

import type { OffmarketInvestorMatchT } from "@/lib/api";
import { ASSET_TYPE_LABELS } from "@/lib/api";

/**
 * Phase F — Investor-Card mit Finanzierungs-Spotlight.
 *
 * Wird auf /offmarket/investoren und /offmarket/leads/[id] gerendert.
 * Hebt bewusst die Finanzierungs-Faehigkeit oben hervor — der USP
 * gegenueber klassischen Portalen ist: der Verkaeufer sieht *vor*
 * der Offenlegung, was der Investor stemmt.
 */
function fmtEUR(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} Mio. €`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k €`;
  return `${n} €`;
}

export function OffmarketInvestorCard({
  match,
  onInvite,
  inviting,
  showScore = true
}: {
  match: OffmarketInvestorMatchT;
  onInvite?: (userId: string) => void;
  inviting?: boolean;
  showScore?: boolean;
}) {
  const profile = match.profile ?? {
    experienceYears: match.experienceYears ?? 0,
    preferredAssetTypes: match.preferredAssetTypes ?? [],
    preferredRegions: match.preferredRegions ?? [],
    minTicketSize: match.minTicketSize,
    maxTicketSize: match.maxTicketSize,
    financingPreApproved: match.financingPreApproved ?? false,
    financingNote: match.financingNote,
    affordability: match.affordability ?? {
      maxLoan: null,
      maxInvestment: null,
      maxMonthlyDebtService: null
    },
    visibility: match.visibility ?? "ON_REQUEST",
    bio: match.bio
  };

  const maxInv = profile.affordability?.maxInvestment ?? null;
  const score = match.score ?? 0;
  const scoreLabel =
    score >= 75 ? "Sehr gut" : score >= 50 ? "Gut" : score >= 25 ? "Mittel" : "Schwach";
  const scoreColor =
    score >= 75
      ? "bg-emerald-100 text-emerald-800"
      : score >= 50
        ? "bg-amber-100 text-amber-800"
        : "bg-zinc-100 text-zinc-700";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold text-zinc-900">
              {match.displayName ?? "Verifizierter Investor"}
            </div>
            {profile.visibility !== "PUBLIC" && (
              <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                anonym
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {profile.experienceYears} Jahre Erfahrung
            {(match.trackrecordCount ?? 0) > 0 && (
              <> · {match.trackrecordCount} Track-Record-Einträge</>
            )}
          </div>
        </div>
        {showScore && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${scoreColor}`}
            title={`Match-Score ${score} / 100`}
          >
            Match {score} · {scoreLabel}
          </span>
        )}
      </div>

      {/* Finanzierungs-Spotlight */}
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 1v22" />
            <path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          Finanzierungsstärke
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-zinc-500">Max. Investitionsvolumen</div>
            <div className="text-base font-semibold text-amber-900">{fmtEUR(maxInv)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Ticket-Range</div>
            <div className="text-base font-semibold text-amber-900">
              {fmtEUR(profile.minTicketSize ?? null)} – {fmtEUR(profile.maxTicketSize ?? null)}
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.financingPreApproved ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
              ✓ Finanzierung vorab geprüft
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
              Eigenkapitalkraft kalkuliert
            </span>
          )}
          {profile.financingNote && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-zinc-700 ring-1 ring-zinc-200">
              {profile.financingNote}
            </span>
          )}
        </div>
      </div>

      {/* Bio + Praeferenzen */}
      {profile.bio && (
        <p className="mt-3 text-sm text-zinc-700 line-clamp-3">{profile.bio}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {profile.preferredAssetTypes.slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
          >
            {ASSET_TYPE_LABELS[t]}
          </span>
        ))}
        {profile.preferredRegions.slice(0, 3).map((r) => (
          <span
            key={r}
            className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700"
          >
            📍 {r}
          </span>
        ))}
      </div>

      {/* Trackrecord-Mini */}
      {(match.trackrecordTop?.length ?? 0) > 0 && (
        <div className="mt-3 rounded-lg bg-zinc-50 p-2 text-[11px]">
          <div className="mb-1 font-semibold text-zinc-600">Track-Record (Auszug)</div>
          <ul className="space-y-0.5">
            {match.trackrecordTop?.slice(0, 3).map((t, i) => (
              <li key={i} className="text-zinc-700">
                {t.year} · {ASSET_TYPE_LABELS[t.type]} in {t.location}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action */}
      {onInvite && (
        <button
          type="button"
          onClick={() => onInvite(match.userId)}
          disabled={match.alreadyInvited || inviting}
          className={
            match.alreadyInvited
              ? "mt-4 w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-500"
              : "mt-4 w-full rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
          }
        >
          {match.alreadyInvited
            ? "Bereits eingeladen"
            : inviting
              ? "Lädt..."
              : "Zum Offmarket-Inserat einladen"}
        </button>
      )}
    </div>
  );
}
