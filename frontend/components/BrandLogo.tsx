/**
 * Infinity-Oikos-Marke.
 *
 * Wir nutzen das Original-Bild (das goldene Symbol + "INFINITY"-Schriftzug
 * aus dem Markenpaket). Der untere "EIDOS"-Teil wird per CSS-Clip
 * abgeschnitten, "OIKOS" wird extern als HTML-Text darunter gerendert
 * (in der gleichen goldenen Optik, gut lesbar, frei skalierbar).
 *
 * Das Original-Bild liegt unter /infinity-logo.jpg im Frontend-public-Ordner.
 *
 * - BrandLogo:    nur der obere Bildausschnitt (Symbol + "INFINITY")
 * - BrandWordmark: nur der "OIKOS"-Schriftzug als HTML
 * - BrandLockup:  beide Elemente kombiniert (fuer Sidebar / Sign-In)
 */

const LOGO_SRC = "/infinity-logo.jpg";

// Anteil des Originalbilds, der angezeigt wird (von oben).
// Original: Symbol (~0-45%), INFINITY (~50-62%), EIDOS (~65-75%).
// Mit 0.6 schneiden wir hart NACH "INFINITY" und VOR "EIDOS" ab.
const VISIBLE_FRACTION = 0.6;

export function BrandLogo({
  width = 180,
  className = "",
  rounded = false
}: {
  width?: number;
  className?: string;
  rounded?: boolean;
}) {
  // Box-Dimensionen: Quadratisches Bild × VISIBLE_FRACTION = Hoehe.
  const height = Math.round(width * VISIBLE_FRACTION);
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${rounded ? "rounded-lg" : ""} ${className}`}
      style={{ width, height }}
      role="img"
      aria-label="Infinity Oikos Logo"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt=""
        className="absolute inset-0 w-full h-auto select-none pointer-events-none"
        style={{ width }}
        draggable={false}
      />
    </div>
  );
}

/**
 * "OIKOS"-Schriftzug — extern als HTML-Text.
 *
 * tone="indigo" (default): Indigo-/Violett-Verlauf — gut auf hellen
 *                          Hintergruenden (Sidebar, weisse Cards).
 * tone="gold":             Warmer Goldverlauf — passt zum goldenen
 *                          INFINITY-Symbol und ist auf dunkelblauem
 *                          Hintergrund (AuthHero, Hero-Gradients) klar
 *                          lesbar.
 */
export function BrandWordmark({
  className = "",
  size = "md",
  tone = "indigo"
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "indigo" | "gold";
}) {
  const fontCls =
    size === "lg"
      ? "text-2xl tracking-[0.55em]"
      : size === "sm"
        ? "text-xs tracking-[0.4em]"
        : "text-sm tracking-[0.5em]";

  const gradientCls =
    tone === "gold"
      ? "bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500"
      : "bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700";

  // Subtiler Drop-Shadow nur fuer Gold — hebt das Wort vom dunklen
  // Hintergrund nochmal etwas stärker ab, ohne ueber das Markenbild
  // hinwegzugehen.
  const shadowStyle =
    tone === "gold"
      ? { filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.35))" }
      : undefined;

  return (
    <div
      className={`font-serif font-semibold bg-clip-text text-transparent ${gradientCls} ${fontCls} ${className}`}
      style={shadowStyle}
      aria-hidden
    >
      OIKOS
    </div>
  );
}

/**
 * Symbol + "INFINITY" (aus Bild) + "OIKOS" (Text) — gestapelt.
 * Standard-Variante fuer alles. Layout:
 *
 *    [    SYMBOL     ]
 *    [   INFINITY    ]   <-- aus Bildausschnitt
 *    [    OIKOS      ]   <-- HTML-Text
 *
 * Optional tone-Prop steuert die OIKOS-Farbe je nach Hintergrund.
 */
export function BrandLockup({
  width = 160,
  className = "",
  tone = "indigo"
}: {
  width?: number;
  className?: string;
  tone?: "indigo" | "gold";
}) {
  const wordmarkSize = width >= 220 ? "lg" : width >= 140 ? "md" : "sm";
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <BrandLogo width={width} />
      <BrandWordmark size={wordmarkSize} tone={tone} className="mt-1" />
    </div>
  );
}
