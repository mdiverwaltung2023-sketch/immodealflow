/**
 * Infinity-Oikos-Marke — komplett als SVG.
 *
 * BrandLogo:    nur das Symbol (goldener Kreis mit stilisierter Figur)
 * BrandWordmark: nur der Schriftzug "INFINITY" + "OIKOS" in Goldverlauf
 * BrandLockup:  beide zusammen, fuer Header / Sidebar / Landing.
 *
 * Variante "gold" passt auf dunklen Hintergrund (z.B. lila Landing),
 * Variante "warm" hat etwas dunklere Bronze/Amber-Toene fuer hellen
 * Sidebar-Hintergrund — bleibt aber gold im Charakter.
 */

type GoldVariant = "gold" | "warm";

function gradId(prefix: string, variant: GoldVariant): string {
  return `${prefix}-${variant}`;
}

function GoldDefs({ variant, idPrefix }: { variant: GoldVariant; idPrefix: string }) {
  // Heller Goldverlauf (auf dunklem Hintergrund) vs. waermeres Bronze
  // (auf hellem Sidebar-Hintergrund, damit es nicht "verschwindet").
  const stops =
    variant === "gold"
      ? [
          { offset: "0%", color: "#fef3c7" },
          { offset: "45%", color: "#fbbf24" },
          { offset: "100%", color: "#b45309" }
        ]
      : [
          { offset: "0%", color: "#fbbf24" },
          { offset: "50%", color: "#d97706" },
          { offset: "100%", color: "#92400e" }
        ];
  return (
    <defs>
      <linearGradient
        id={gradId(idPrefix, variant)}
        x1="0%"
        y1="0%"
        x2="100%"
        y2="100%"
      >
        {stops.map((s) => (
          <stop key={s.offset} offset={s.offset} stopColor={s.color} />
        ))}
      </linearGradient>
    </defs>
  );
}

/* =========================================================
 * BrandLogo — nur das Symbol.
 * Goldener Kreis (oben rechts geoeffnet) mit stilisierter Figur
 * (Kopf + Arme + V-Beine) und einem leichten "Tropfen" rechts.
 * =======================================================*/
export function BrandLogo({
  size = 48,
  className,
  variant = "gold"
}: {
  size?: number;
  className?: string;
  variant?: GoldVariant;
}) {
  const id = gradId("oikos-symbol", variant);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Infinity Oikos"
    >
      <GoldDefs variant={variant} idPrefix="oikos-symbol" />

      {/* Aussenkreis — C-foermig, oben rechts offen */}
      <path
        d="M 50,9 A 41,41 0 1,0 91,50"
        stroke={`url(#${id})`}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tropfen rechts oben — Akzent, der die Oeffnung schliesst */}
      <path
        d="M 78,18 Q 92,30 86,46 Q 74,50 68,38 Q 66,26 78,18 Z"
        fill={`url(#${id})`}
      />

      {/* Stilisierte Figur innen — Kopf */}
      <circle cx="42" cy="34" r="5.5" fill={`url(#${id})`} />

      {/* Ausgestreckte Arme — leichter Bogen */}
      <path
        d="M 24,52 Q 42,38 60,52"
        stroke={`url(#${id})`}
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* V-Beine */}
      <path
        d="M 42,46 L 32,76 M 42,46 L 56,76"
        stroke={`url(#${id})`}
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* =========================================================
 * BrandWordmark — Schriftzug "INFINITY" / "OIKOS"
 * im Goldverlauf, antiqua/serif Look.
 * =======================================================*/
export function BrandWordmark({
  width = 180,
  className,
  variant = "gold"
}: {
  width?: number;
  className?: string;
  variant?: GoldVariant;
}) {
  const id = gradId("oikos-word", variant);
  return (
    <svg
      width={width}
      viewBox="0 0 220 70"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Infinity Oikos"
    >
      <GoldDefs variant={variant} idPrefix="oikos-word" />

      {/* INFINITY — gross */}
      <text
        x="110"
        y="38"
        textAnchor="middle"
        fontFamily="'Cinzel','Trajan Pro','Cormorant Garamond',Georgia,serif"
        fontWeight="700"
        fontSize="30"
        letterSpacing="4.2"
        fill={`url(#${id})`}
      >
        INFINITY
      </text>

      {/* OIKOS — klein, weit gesperrt, gut lesbar */}
      <text
        x="110"
        y="60"
        textAnchor="middle"
        fontFamily="'Cinzel','Trajan Pro','Cormorant Garamond',Georgia,serif"
        fontWeight="600"
        fontSize="15"
        letterSpacing="9"
        fill={`url(#${id})`}
      >
        OIKOS
      </text>
    </svg>
  );
}

/* =========================================================
 * BrandLockup — Symbol + Schriftzug nebeneinander
 * (fuer Sidebar oben links) oder gestapelt (fuer Sign-In).
 * =======================================================*/
export function BrandLockup({
  size = 44,
  variant = "warm",
  layout = "row"
}: {
  size?: number;
  variant?: GoldVariant;
  layout?: "row" | "stack";
}) {
  if (layout === "stack") {
    return (
      <div className="flex flex-col items-center gap-2">
        <BrandLogo size={size * 1.6} variant={variant} />
        <BrandWordmark width={size * 5} variant={variant} />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <BrandLogo size={size} variant={variant} />
      <BrandWordmark width={size * 3.2} variant={variant} />
    </div>
  );
}
