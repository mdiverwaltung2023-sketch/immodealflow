import { BrandLockup } from "./BrandLogo";

/**
 * Linke Spalte für /sign-in, /sign-up und Landing-Page.
 * Indigo-Gradient, Branding oben, Headline mit goldenem Akzent,
 * Feature-Liste, Footer unten.
 */
export function AuthHero({ headlineLine1, headlineLine2 }: { headlineLine1: string; headlineLine2: string }) {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1a1745] via-[#241b6b] to-[#3b0d6b] p-10 text-white lg:p-14">
      {/* Subtle goldener Lichtschimmer */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #facc15, transparent)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #6366f1, transparent)" }}
      />

      {/* Top: Branding */}
      <div className="relative z-10">
        <BrandLockup width={220} className="text-white" />
      </div>

      {/* Mitte: Headline + Feature-Liste */}
      <div className="relative z-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold leading-tight lg:text-5xl">
            {headlineLine1}
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {headlineLine2}
            </span>
          </h1>
          <p className="max-w-md text-sm text-indigo-200 lg:text-base">
            Two-Sided Marketplace für Mehrfamilienhäuser und Gewerbe. Verkäufer
            sehen Bonität, Trackrecord und Finanzierungsstatus jedes Investors —
            keine Phantomanfragen mehr.
          </p>
        </div>

        <ul className="space-y-3 text-sm">
          <Feature>Verkäufer-Inserate mit Anonymisierungsstufen</Feature>
          <Feature>Investor-Profile mit Bonität & Trackrecord</Feature>
          <Feature>Beidseitiges Bewertungssystem nach Notartermin</Feature>
          <Feature>ZVG-Importer + Bietlimit-Kalkulation</Feature>
        </ul>
      </div>

      {/* Bottom: Copyright */}
      <div className="relative z-10 text-xs text-indigo-300">
        © 2026 Infinity Oikos · Marketplace für Investoren und Verkäufer
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="text-indigo-100">{children}</span>
    </li>
  );
}
