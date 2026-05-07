/**
 * Infinity-Oikos-Logo: stilisiertes Unendlich-Symbol in Gold/Amber.
 * Wiederverwendbare SVG-Komponente — Größe per `size` Prop steuerbar.
 */
export function BrandLogo({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Infinity Oikos"
    >
      <defs>
        <linearGradient id="oikosGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id="oikosBg" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f0c29" />
        </radialGradient>
      </defs>

      {/* Hintergrund-Quadrat mit dezentem Glow */}
      <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#oikosBg)" />

      {/* Stilisiertes Unendlich-Zeichen — zwei Schleifen */}
      <path
        d="M18 32 C18 24, 26 22, 32 32 C38 42, 46 40, 46 32 C46 24, 38 22, 32 32 C26 42, 18 40, 18 32 Z"
        stroke="url(#oikosGold)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Zentraler Punkt — symbolisiert "Oikos" / Heim */}
      <circle cx="32" cy="32" r="2.5" fill="url(#oikosGold)" />
    </svg>
  );
}

/**
 * Kombinierte Marken-Lockup: Logo + Name + Subtitel.
 * Für Header-Branding oder Sign-In-Pages.
 */
export function BrandLockup({
  size = 40,
  variant = "light"
}: {
  size?: number;
  variant?: "light" | "dark";
}) {
  const nameCls = variant === "light" ? "text-white" : "text-zinc-900";
  const subCls = variant === "light" ? "text-indigo-200" : "text-zinc-500";
  return (
    <div className="flex items-center gap-3">
      <BrandLogo size={size} />
      <div className="leading-tight">
        <div className={`text-base font-semibold ${nameCls}`}>Infinity Oikos</div>
        <div className={`text-[10px] uppercase tracking-[0.2em] ${subCls}`}>
          Marketplace · MFH · Gewerbe
        </div>
      </div>
    </div>
  );
}
