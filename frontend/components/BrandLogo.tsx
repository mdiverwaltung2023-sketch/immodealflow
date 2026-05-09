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
// Original: Symbol oben, INFINITY-Mitte, EIDOS unten -> wir zeigen die
// oberen 70 % und blenden EIDOS aus.
const VISIBLE_FRACTION = 0.7;

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
 * "OIKOS"-Schriftzug — extern als HTML-Text. Gold-Verlauf via
 * background-clip:text, gut lesbar.
 */
export function BrandWordmark({
  className = "",
  size = "md"
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const fontCls =
    size === "lg"
      ? "text-2xl tracking-[0.55em]"
      : size === "sm"
        ? "text-xs tracking-[0.4em]"
        : "text-sm tracking-[0.5em]";
  return (
    <div
      className={`font-serif font-semibold bg-clip-text text-transparent bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 ${fontCls} ${className}`}
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
 */
export function BrandLockup({
  width = 160,
  className = ""
}: {
  width?: number;
  className?: string;
}) {
  const wordmarkSize = width >= 220 ? "lg" : width >= 140 ? "md" : "sm";
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <BrandLogo width={width} />
      <BrandWordmark size={wordmarkSize} className="mt-1" />
    </div>
  );
}
