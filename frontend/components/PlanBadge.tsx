import Link from "next/link";
import type { UserPlanT } from "@/lib/api";

const TONES: Record<UserPlanT, { cls: string; label: string }> = {
  FREE: {
    cls: "bg-zinc-100 text-zinc-600 border-zinc-200",
    label: "Beobachter"
  },
  INVESTOR_PRO: {
    cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
    label: "Investor Club"
  },
  // Legacy: Bestandskunden behalten ihren Plan, im UI nicht mehr aktiv angeboten.
  SELLER_PRO: {
    cls: "bg-amber-50 text-amber-800 border-amber-200",
    label: "Verkäufer Pro"
  }
};

/**
 * Kleines Plan-Badge — Free klickbar zur Pricing-Page,
 * Pro-Pläne nur Anzeige.
 */
export function PlanBadge({
  plan,
  size = "sm",
  asLink = true
}: {
  plan: UserPlanT;
  size?: "sm" | "md";
  asLink?: boolean;
}) {
  const tone = TONES[plan];
  const sizeCls =
    size === "md"
      ? "px-3 py-1 text-xs"
      : "px-2.5 py-0.5 text-[11px]";

  const inner = (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${sizeCls} ${tone.cls}`}
    >
      {plan === "FREE" ? null : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
        </svg>
      )}
      {tone.label}
    </span>
  );

  if (asLink && plan === "FREE") {
    return (
      <Link href="/pricing" title="Mitglied im Investor Club werden">
        {inner}
      </Link>
    );
  }
  return inner;
}
