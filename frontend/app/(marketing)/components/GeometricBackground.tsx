/**
 * Phase L10 — abstrakter Hero-Hintergrund. Sanfte Indigo/Violett-
 * Verläufe + ein paar konzentrische Kreise. Kein Foto, kein
 * Stockmaterial — wirkt sauberer und modern.
 */
export function GeometricBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Verlauf */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-indigo-50/40 to-violet-100/60" />

      {/* Konzentrische Kreise oben rechts */}
      <svg
        className="absolute -top-40 -right-40 h-[640px] w-[640px] opacity-40"
        viewBox="0 0 600 600"
        fill="none"
      >
        <defs>
          <radialGradient id="g1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="280" stroke="#6366f1" strokeWidth="0.5" opacity="0.3" />
        <circle cx="300" cy="300" r="220" stroke="#6366f1" strokeWidth="0.5" opacity="0.25" />
        <circle cx="300" cy="300" r="160" stroke="#6366f1" strokeWidth="0.5" opacity="0.2" />
        <circle cx="300" cy="300" r="100" fill="url(#g1)" />
      </svg>

      {/* Soft glow unten links */}
      <svg
        className="absolute -bottom-32 -left-32 h-[500px] w-[500px] opacity-30"
        viewBox="0 0 500 500"
        fill="none"
      >
        <defs>
          <radialGradient id="g2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="250" cy="250" r="250" fill="url(#g2)" />
      </svg>

      {/* Subtile Diagonal-Linien rechts unten */}
      <svg
        className="absolute right-10 top-1/3 h-32 w-32 opacity-20"
        viewBox="0 0 100 100"
        fill="none"
        stroke="#4f46e5"
        strokeWidth="0.6"
      >
        <line x1="0" y1="100" x2="100" y2="0" />
        <line x1="20" y1="100" x2="100" y2="20" />
        <line x1="40" y1="100" x2="100" y2="40" />
        <line x1="60" y1="100" x2="100" y2="60" />
      </svg>
    </div>
  );
}
