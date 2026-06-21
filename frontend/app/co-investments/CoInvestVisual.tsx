import { ASSET_TYPE_LABELS, type AssetTypeT } from "@/lib/api";

/**
 * Visueller Kopf einer Co-Investment-Karte / -Detailseite.
 * - Objekt-Gesuch mit Bild -> echtes Immobilienfoto (cover).
 * - sonst -> stimmiger Verlaufs-Hero je Objektart mit Gebaeude-Glyphe.
 * Reine Praesentation (kein State) -> auch in Server-Components nutzbar.
 */

const ASSET_GRADIENTS: Record<string, string> = {
  MFH: "from-teal-600 via-teal-700 to-emerald-800",
  COMMERCIAL: "from-slate-600 via-slate-700 to-slate-900",
  MIXED_USE: "from-cyan-600 via-teal-700 to-teal-900",
  SINGLE_FAMILY: "from-emerald-600 via-emerald-700 to-green-800",
  APARTMENT: "from-sky-600 via-indigo-600 to-indigo-800",
  LAND: "from-lime-600 via-emerald-600 to-emerald-800",
  OTHER: "from-teal-600 via-cyan-700 to-teal-900"
};

function gradientFor(assetType: string | null | undefined): string {
  if (assetType && ASSET_GRADIENTS[assetType]) return ASSET_GRADIENTS[assetType];
  return ASSET_GRADIENTS.OTHER;
}

function assetLabel(t: string | null | undefined): string {
  if (!t) return "Immobilie";
  return (ASSET_TYPE_LABELS as Record<string, string>)[t] ?? t;
}

export function CoInvestVisual({
  imageUrl,
  assetType,
  title,
  heightCls = "h-40",
  rounded = "rounded-t-2xl"
}: {
  imageUrl?: string | null;
  assetType?: AssetTypeT | string | null;
  title?: string;
  heightCls?: string;
  rounded?: string;
}) {
  if (imageUrl) {
    return (
      <div className={`relative ${heightCls} w-full overflow-hidden ${rounded} bg-slate-100`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title ?? "Objektbild"}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={`relative ${heightCls} w-full overflow-hidden ${rounded} bg-gradient-to-br ${gradientFor(
        assetType
      )}`}
    >
      <svg
        className="absolute -right-4 -bottom-4 h-36 w-36 text-white/15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9h0M9 12h0M9 15h0" />
      </svg>
      <div className="absolute left-4 top-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {assetLabel(assetType)}
        </span>
      </div>
    </div>
  );
}
