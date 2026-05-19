import type { ReactNode } from "react";
import type { SaleStageT } from "@/lib/api";

/**
 * Phase M3 — Icons + Farbpalette fuer die 13 Verkaufs-Stages.
 *
 * Jede Stage bekommt ein eigenes Inline-SVG-Icon (Heroicons-Outline-Stil,
 * 24x24, stroke 2) und eine eigene Farbpalette. Wird sowohl im
 * horizontalen Pipeline-Stepper (`/sales/[id]`) als auch in der
 * Werbe-Sicht im `StartSaleProcessButton` genutzt.
 *
 * Die Farben sind so gewaehlt, dass sie als visuelle Reise von
 * Indigo (Anfang) ueber Gelb (Geldzahlung) bis Rose (Abschluss)
 * gelesen werden koennen — und Abgebrochen klar als Off-Track
 * (Zinc).
 */

export type StageTone = {
  /** Hex-Hintergrundklasse fuer den runden Knoten (active/upcoming). */
  bg: string;
  /** Textklasse fuer Icon / Zahl bei upcoming. */
  fg: string;
  /** Ring-Farbe fuer den Knoten-Highlight. */
  ring: string;
  /** Pillen-Hintergrund fuer Werbe-Sicht. */
  pillBg: string;
  /** Pillen-Text/Border fuer Werbe-Sicht. */
  pillText: string;
};

export const SALE_STAGE_TONES: Record<SaleStageT, StageTone> = {
  ANFRAGE_AKZEPTIERT: {
    bg: "bg-indigo-500",
    fg: "text-indigo-600",
    ring: "ring-indigo-200",
    pillBg: "bg-indigo-50",
    pillText: "text-indigo-700 border-indigo-200"
  },
  BESICHTIGUNG: {
    bg: "bg-sky-500",
    fg: "text-sky-600",
    ring: "ring-sky-200",
    pillBg: "bg-sky-50",
    pillText: "text-sky-700 border-sky-200"
  },
  VERHANDLUNG: {
    bg: "bg-amber-500",
    fg: "text-amber-600",
    ring: "ring-amber-200",
    pillBg: "bg-amber-50",
    pillText: "text-amber-700 border-amber-200"
  },
  RESERVIERUNG_LOI: {
    bg: "bg-violet-500",
    fg: "text-violet-600",
    ring: "ring-violet-200",
    pillBg: "bg-violet-50",
    pillText: "text-violet-700 border-violet-200"
  },
  NOTARENTWURF: {
    bg: "bg-cyan-500",
    fg: "text-cyan-600",
    ring: "ring-cyan-200",
    pillBg: "bg-cyan-50",
    pillText: "text-cyan-700 border-cyan-200"
  },
  NOTARTERMIN: {
    bg: "bg-teal-500",
    fg: "text-teal-600",
    ring: "ring-teal-200",
    pillBg: "bg-teal-50",
    pillText: "text-teal-700 border-teal-200"
  },
  BEURKUNDET: {
    bg: "bg-emerald-500",
    fg: "text-emerald-600",
    ring: "ring-emerald-200",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700 border-emerald-200"
  },
  AUFLASSUNGSVORMERKUNG: {
    bg: "bg-lime-500",
    fg: "text-lime-700",
    ring: "ring-lime-200",
    pillBg: "bg-lime-50",
    pillText: "text-lime-800 border-lime-200"
  },
  KAUFPREISZAHLUNG: {
    bg: "bg-yellow-500",
    fg: "text-yellow-700",
    ring: "ring-yellow-200",
    pillBg: "bg-yellow-50",
    pillText: "text-yellow-800 border-yellow-200"
  },
  UEBERGABE: {
    bg: "bg-orange-500",
    fg: "text-orange-600",
    ring: "ring-orange-200",
    pillBg: "bg-orange-50",
    pillText: "text-orange-700 border-orange-200"
  },
  EIGENTUMSUMSCHREIBUNG: {
    bg: "bg-pink-500",
    fg: "text-pink-600",
    ring: "ring-pink-200",
    pillBg: "bg-pink-50",
    pillText: "text-pink-700 border-pink-200"
  },
  ABGESCHLOSSEN: {
    bg: "bg-rose-500",
    fg: "text-rose-600",
    ring: "ring-rose-200",
    pillBg: "bg-rose-50",
    pillText: "text-rose-700 border-rose-200"
  },
  ABGEBROCHEN: {
    bg: "bg-zinc-400",
    fg: "text-zinc-500",
    ring: "ring-zinc-200",
    pillBg: "bg-zinc-50",
    pillText: "text-zinc-600 border-zinc-200"
  }
};

/** Gemeinsame Props fuer alle SVGs. */
const svgProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

function HandshakeIcon() {
  // Vereinfachter Handshake: zwei Haende, die sich treffen
  return (
    <svg {...svgProps}>
      <path d="M2 13l4-4 4 4 6-6 4 4-7 7c-1 1-2 1-3 0l-4-4Z" />
      <path d="M14 9l3 3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg {...svgProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ChatBubblesIcon() {
  return (
    <svg {...svgProps}>
      <path d="M3 12c0-3.3 2.7-6 6-6h5c3.3 0 6 2.7 6 6v0c0 3.3-2.7 6-6 6h-1l-3 3v-3H9c-3.3 0-6-2.7-6-6v0Z" />
      <path d="M8 10h6M8 13h4" />
    </svg>
  );
}

function LockClosedIcon() {
  return (
    <svg {...svgProps}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  );
}

function DocumentEditIcon() {
  return (
    <svg {...svgProps}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
      <path d="M14 3v6h6" />
      <path d="M9 14l3 3 4-5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...svgProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="1.2" />
    </svg>
  );
}

function StampIcon() {
  return (
    <svg {...svgProps}>
      <path d="M9 3h6l-1 6h2a3 3 0 0 1 3 3v3H5v-3a3 3 0 0 1 3-3h2L9 3Z" />
      <path d="M4 20h16" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg {...svgProps}>
      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function EuroBanknoteIcon() {
  return (
    <svg {...svgProps}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M14 9.5a3.5 3.5 0 0 0-3.5 2.5 3.5 3.5 0 0 0 3.5 2.5" />
      <path d="M9 11h4M9 13h4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="7" cy="14" r="3" />
      <path d="M9.5 12L21 .5" />
      <path d="M15 7l3 3M18 4l3 3" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="10" r="6" />
      <path d="M9 14l-2 7 5-3 5 3-2-7" />
      <path d="M12 8v4M10 10h4" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg {...svgProps}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M16 6h3v2a3 3 0 0 1-3 3M8 6H5v2a3 3 0 0 0 3 3" />
      <path d="M10 13v3M14 13v3M8 19h8M9 19h6l-1-3h-4l-1 3Z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

const STAGE_ICON: Record<SaleStageT, () => ReactNode> = {
  ANFRAGE_AKZEPTIERT: HandshakeIcon,
  BESICHTIGUNG: EyeIcon,
  VERHANDLUNG: ChatBubblesIcon,
  RESERVIERUNG_LOI: LockClosedIcon,
  NOTARENTWURF: DocumentEditIcon,
  NOTARTERMIN: CalendarIcon,
  BEURKUNDET: StampIcon,
  AUFLASSUNGSVORMERKUNG: ShieldCheckIcon,
  KAUFPREISZAHLUNG: EuroBanknoteIcon,
  UEBERGABE: KeyIcon,
  EIGENTUMSUMSCHREIBUNG: CertificateIcon,
  ABGESCHLOSSEN: TrophyIcon,
  ABGEBROCHEN: XCircleIcon
};

/** Reines Icon-Element fuer eine Stage (kein Container, kein Kreis). */
export function SaleStageIcon({
  stage,
  className = "h-5 w-5"
}: {
  stage: SaleStageT;
  className?: string;
}) {
  const Cmp = STAGE_ICON[stage];
  return (
    <span className={className} aria-hidden="true">
      <Cmp />
    </span>
  );
}
