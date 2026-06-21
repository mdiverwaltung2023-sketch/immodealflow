import { Card } from "@/components/ui";
import { TrustBadge } from "@/components/TrustBadge";
import { TRUST_BADGE_LABELS, TRUST_BREAKDOWN_MAX, type TrustScoreT } from "@/lib/api";

const FACTORS: { key: keyof TrustScoreT["breakdown"]; label: string }[] = [
  { key: "verifizierung", label: "Verifizierung & Profil" },
  { key: "trackRecord", label: "Track Record" },
  { key: "bewertungen", label: "Bewertungen" },
  { key: "aktivitaet", label: "Aktivität" }
];

export function TrustScorePanel({ trust }: { trust: TrustScoreT }) {
  return (
    <Card title="Mein Investor Trust Score">
      {!trust.hasProfile ? (
        <div className="text-sm text-zinc-500">
          Lege unten dein Investor-Profil an, um deinen Trust Score zu berechnen.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white">
              <span className="text-2xl font-bold leading-none">{trust.score}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-80">/ 100</span>
            </div>
            <div>
              <TrustBadge tier={trust.tier} score={trust.score} size="md" />
              <p className="mt-1.5 max-w-md text-xs text-zinc-500">
                Berechnet aus deinen Profilangaben, Track Record, Bewertungen und Aktivität.
                Identitäts-/EK-Verifizierung (KYC) folgt als nächste Stufe.
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2">
            {FACTORS.map((f) => {
              const val = trust.breakdown[f.key];
              const max = TRUST_BREAKDOWN_MAX[f.key];
              const pct = Math.round((val / max) * 100);
              return (
                <div key={f.key}>
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-600">
                    <span>{f.label}</span>
                    <span className="text-zinc-400">{val} / {max}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Badges */}
          {trust.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {trust.badges.map((b) => (
                <span key={b} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-200">
                  {TRUST_BADGE_LABELS[b] ?? b}
                </span>
              ))}
            </div>
          )}

          {/* Tipps */}
          {trust.tips.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">So verbesserst du deinen Score</div>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                {trust.tips.map((t, i) => (
                  <li key={i} className="flex gap-2"><span className="text-teal-600">→</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
