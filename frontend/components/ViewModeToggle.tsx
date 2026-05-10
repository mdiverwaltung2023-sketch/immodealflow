"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserRoleT } from "@/lib/api";
import {
  VIEW_MODE_EVENT,
  VIEW_MODE_LABELS,
  defaultModeForRole,
  getAllowedModes,
  readViewModeFor,
  setViewMode,
  type ViewMode
} from "@/components/viewMode";

/**
 * Segmented-Control oben in der TopBar — sichtbar für Multi-Rollen
 * (BOTH, BROKER). Reine Rollen sehen den Toggle gar nicht.
 *
 * Phase L7 — kein "Beides"-Modus mehr; saubere Single-View-Wahl
 * zwischen den für die Rolle erlaubten Sichten. BOTH und BROKER
 * bekommen alle 4 (Investor / Verkäufer / Vermieter / Mieter).
 */
export function ViewModeToggle({ userRole }: { userRole: UserRoleT }) {
  const allowed = useMemo(() => getAllowedModes(userRole), [userRole]);
  const [mode, setMode] = useState<ViewMode>(defaultModeForRole(userRole));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setMode(readViewModeFor(userRole));

    function onChange(e: Event) {
      const next = (e as CustomEvent<ViewMode>).detail;
      if (allowed.includes(next)) setMode(next);
    }
    window.addEventListener(VIEW_MODE_EVENT, onChange);
    return () => window.removeEventListener(VIEW_MODE_EVENT, onChange);
  }, [userRole, allowed]);

  // Toggle nur fuer Multi-Rollen sichtbar
  if (allowed.length <= 1) return null;

  function pick(next: ViewMode) {
    setMode(next);
    setViewMode(next);
  }

  return (
    <div
      role="tablist"
      aria-label="Sicht wechseln"
      className="hidden md:inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs"
    >
      {allowed.map((opt) => {
        const active = hydrated && mode === opt;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => pick(opt)}
            className={
              active
                ? "rounded-full bg-white px-3 py-1 font-semibold text-indigo-700 shadow-sm"
                : "rounded-full px-3 py-1 text-zinc-600 hover:text-zinc-900"
            }
          >
            {VIEW_MODE_LABELS[opt]}
          </button>
        );
      })}
    </div>
  );
}
