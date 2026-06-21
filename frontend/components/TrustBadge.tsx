import { TRUST_TIER_LABELS } from "@/lib/api";

/**
 * Vertrauens-Badge (Stufe + optional Score). Reine Praesentation —
 * auch in Server-Components nutzbar.
 */
const TIER_STYLE: Record<string, string> = {
  BRONZE: "bg-amber-100 text-amber-800 border-amber-200",
  SILBER: "bg-slate-100 text-slate-700 border-slate-300",
  GOLD: "bg-yellow-100 text-yellow-800 border-yellow-300",
  PLATIN: "bg-teal-100 text-teal-800 border-teal-300"
};

export function TrustBadge({
  tier,
  score,
  size = "sm"
}: {
  tier: string;
  score?: number | null;
  size?: "sm" | "md";
}) {
  const cls = TIER_STYLE[tier] ?? TIER_STYLE.BRONZE;
  const label = (TRUST_TIER_LABELS as Record<string, string>)[tier] ?? tier;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${cls} ${
        size === "md" ? "text-sm" : "text-[11px]"
      }`}
      title={`Trust Score: ${score ?? "—"}/100 (${label})`}
    >
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l8 3v6c0 5-3.4 8.3-8 11-4.6-2.7-8-6-8-11V5l8-3z" />
      </svg>
      Trust {label}
      {score != null ? ` · ${score}` : ""}
    </span>
  );
}
