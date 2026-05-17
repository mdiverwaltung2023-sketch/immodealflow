"use client";

import type { OffmarketImageT } from "@/lib/api";

/**
 * Phase F.2 + F.3 — Anonymisierte Offmarket-Bildanzeige.
 *
 * Drei Stufen kombiniert:
 *   1) CSS-Blur (Sofort-Sicherheit, falls Server-Blur noch nicht fertig)
 *   2) Server-side blurredUrl (sharp) — wird als <img src> gerendert,
 *      ZUSAETZLICH leichter CSS-Blur als Sicherheits-Schicht
 *   3) stylizedUrl (KI Aquarell) — wenn vorhanden, hat Vorrang, gerendert
 *      OHNE CSS-Blur (ist ja bereits anonymisiert)
 *
 * Plus: Goldsiegel-Wasserzeichen "OFFMARKET" in der Ecke.
 */
type Mode = "anon" | "full"; // full = nach ACCEPTED, originalUrl da

export function OffmarketImage({
  image,
  mode = "anon",
  className = "",
  showWatermark = true
}: {
  image: OffmarketImageT;
  mode?: Mode;
  className?: string;
  showWatermark?: boolean;
}) {
  // Welche Variante zeigen wir?
  let src: string | null = null;
  let cssBlur = "";
  let label = "";

  if (mode === "full" && image.originalUrl) {
    src = image.originalUrl;
    cssBlur = "";
    label = "Original";
  } else if (image.stylizedUrl) {
    src = image.stylizedUrl;
    cssBlur = "";
    label = "KI-Aquarell";
  } else if (image.blurredUrl) {
    src = image.blurredUrl;
    // Mini-CSS-Blur als Belt-and-Suspenders
    cssBlur = "blur(2px)";
    label = "Anonymisiert";
  } else if (image.originalUrl) {
    // Fallback: Server-Blur noch nicht fertig — wir blurren stark im CSS
    src = image.originalUrl;
    cssBlur = "blur(28px) saturate(1.2)";
    label = "Vorschau anonymisiert";
  }

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-zinc-100 text-xs text-zinc-400 ${className}`}
      >
        Kein Bild
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-zinc-100 ${className}`}>
      {/* Bild */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={image.alt ?? ""}
        className="h-full w-full object-cover"
        style={{ filter: cssBlur || undefined, transform: cssBlur ? "scale(1.05)" : undefined }}
      />

      {/* Warmer Gradient-Overlay fuer Premium-Look */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-amber-900/10 via-transparent to-zinc-900/10" />

      {/* Goldsiegel-Wasserzeichen */}
      {showWatermark && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-zinc-900/60 px-2.5 py-1 backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_1px_rgba(251,191,36,0.8)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
            Offmarket
          </span>
        </div>
      )}

      {/* Label unten rechts: was sehe ich? */}
      {label && (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-zinc-900/55 px-2 py-0.5 text-[10px] text-zinc-100 backdrop-blur-sm">
          {label}
        </div>
      )}

      {/* Caption (von Claude generierte Lichtstimmungs-Beschreibung) */}
      {image.caption && mode === "anon" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-900/85 to-transparent p-3">
          <div className="text-[11px] italic text-zinc-100 line-clamp-2">
            "{image.caption}"
          </div>
        </div>
      )}
    </div>
  );
}
