import type { RatingSummaryT } from "@/lib/api";

/**
 * Read-only Sterne-Anzeige aus einem Rating-Summary.
 * Bei count=0 zeigen wir "Noch keine Bewertungen" statt 0 Sternen.
 */
export function StarSummary({
  summary,
  size = "sm",
  withCount = true
}: {
  summary: RatingSummaryT | null | undefined;
  size?: "sm" | "md" | "lg";
  withCount?: boolean;
}) {
  if (!summary || summary.count === 0) {
    return (
      <span className={`text-zinc-500 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
        Noch keine Bewertungen
      </span>
    );
  }
  const avg = summary.avg ?? 0;
  const full = Math.floor(avg);
  const half = avg - full >= 0.5;
  const stars = "★".repeat(full) + (half ? "½" : "") + "☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
  const cls =
    size === "lg"
      ? "text-base"
      : size === "md"
      ? "text-sm"
      : "text-xs";
  return (
    <span className={`inline-flex items-center gap-1 ${cls}`}>
      <span className="text-amber-500">{stars}</span>
      <span className="text-zinc-700">{avg.toFixed(1)}</span>
      {withCount ? (
        <span className="text-zinc-500">({summary.count})</span>
      ) : null}
    </span>
  );
}

/**
 * Interaktive 1–5 Sterne-Auswahl.
 */
export function StarPicker({
  value,
  onChange,
  disabled
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`text-2xl transition disabled:opacity-50 ${
            value >= n ? "text-amber-500" : "text-zinc-300 hover:text-zinc-400"
          }`}
          aria-label={`${n} Sterne`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-xs text-zinc-500">{value}/5</span>
    </div>
  );
}
