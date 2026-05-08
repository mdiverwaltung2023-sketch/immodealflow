/**
 * Geteilte Konstanten + Helper für den Sidebar-View-Mode.
 *
 * View-Mode steuert, welche Sektionen die Sidebar zeigt — relevant nur
 * für Nutzer mit Rolle "BOTH". Wer reiner SELLER oder INVESTOR ist,
 * sieht den Toggle gar nicht.
 *
 * Persistenz: localStorage (User-spezifisch via Browser).
 * Cross-component-Sync: CustomEvent auf `window`.
 */

export type ViewMode = "BOTH" | "INVESTOR" | "SELLER";

export const VIEW_MODE_STORAGE_KEY = "io-view-mode";
export const VIEW_MODE_EVENT = "io:view-mode-change";

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  BOTH: "Beides",
  INVESTOR: "Investor",
  SELLER: "Verkäufer"
};

export function setViewMode(mode: ViewMode) {
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(VIEW_MODE_EVENT, { detail: mode }));
}

export function readViewMode(): ViewMode {
  try {
    const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === "INVESTOR" || saved === "SELLER" || saved === "BOTH") {
      return saved;
    }
  } catch {
    // ignore
  }
  return "BOTH";
}
