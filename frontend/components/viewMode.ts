/**
 * Geteilte Konstanten + Helper für den TopBar-View-Mode.
 *
 * View-Mode steuert, welche Sektionen die Sidebar zeigt — relevant nur
 * für Nutzer mit Rolle "BOTH" oder "BROKER" (die mehrere Sichten
 * abdecken können). Reine Rollen (INVESTOR, SELLER, LANDLORD, TENANT)
 * sehen den Toggle gar nicht — ihre Sicht ist fix.
 *
 * Phase L7 — kein "BOTH"-Modus mehr (war nur Doppelanzeige). Stattdessen
 * sauberer Single-View-Switch zwischen den verfügbaren Rollensichten.
 *
 * Persistenz: localStorage (User-spezifisch via Browser).
 * Cross-component-Sync: CustomEvent auf `window`.
 */

import type { UserRoleT } from "@/lib/api";

export type ViewMode = "INVESTOR" | "SELLER" | "LANDLORD" | "TENANT";

export const VIEW_MODE_STORAGE_KEY = "io-view-mode";
export const VIEW_MODE_EVENT = "io:view-mode-change";

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  INVESTOR: "Investor",
  SELLER: "Verkäufer",
  LANDLORD: "Vermieter",
  TENANT: "Mieter"
};

const ALL_MODES: ViewMode[] = ["INVESTOR", "SELLER", "LANDLORD", "TENANT"];

function isViewMode(x: string | null): x is ViewMode {
  return x === "INVESTOR" || x === "SELLER" || x === "LANDLORD" || x === "TENANT";
}

/**
 * Welche View-Modes darf eine bestimmte Rolle umschalten?
 *  - INVESTOR / SELLER / LANDLORD / TENANT: nur den eigenen (Toggle versteckt)
 *  - BOTH:   alle vier Sichten — wer mehrere Dinge macht, kann auch
 *            mal vermieten oder mieten wollen.
 *  - BROKER: alle vier Sichten (Makler deckt alles ab).
 */
export function getAllowedModes(role: UserRoleT): ViewMode[] {
  switch (role) {
    case "INVESTOR":
      return ["INVESTOR"];
    case "SELLER":
      return ["SELLER"];
    case "LANDLORD":
      return ["LANDLORD"];
    case "TENANT":
      return ["TENANT"];
    case "BOTH":
    case "BROKER":
      return ALL_MODES;
    default:
      return ["INVESTOR"];
  }
}

/**
 * Default-Sicht beim ersten Login einer Multi-Rolle.
 * BOTH startet als INVESTOR, BROKER ebenfalls als INVESTOR.
 */
export function defaultModeForRole(role: UserRoleT): ViewMode {
  return getAllowedModes(role)[0];
}

export function setViewMode(mode: ViewMode) {
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(VIEW_MODE_EVENT, { detail: mode }));
}

/**
 * Liest den gespeicherten Modus, validiert gegen die erlaubten Modes
 * der aktuellen Rolle. Falls der Speicher leer / ungültig / nicht
 * erlaubt ist (z.B. Legacy-Wert "BOTH"), kommt der Default zurück.
 */
export function readViewModeFor(role: UserRoleT): ViewMode {
  const allowed = getAllowedModes(role);
  try {
    const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (isViewMode(saved) && allowed.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return allowed[0];
}
