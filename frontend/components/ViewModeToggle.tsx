"use client";

import { useEffect, useState } from "react";
import type { UserRoleT } from "@/lib/api";
import {
  VIEW_MODE_EVENT,
  VIEW_MODE_LABELS,
  readViewMode,
  setViewMode,
  type ViewMode
} from "@/components/viewMode";

const OPTIONS: ViewMode[] = ["BOTH", "INVESTOR", "SELLER", "LANDLORD"];

/**
 * Segmented-Control oben in der TopBar — sichtbar für Nutzer mit
 * Rolle "BOTH" oder "BROKER" (alle anderen haben eine feste Sicht).
 * Wechselt die Sidebar-Sektionen, persistiert in localStorage.
 */
export function ViewModeToggle({ userRole }: { userRole: UserRoleT }) {
  const [mode, setMode] = useState<ViewMode>("BOTH");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setMode(readViewMode());

    function onChange(e: Event) {
      const next = (e as CustomEvent<ViewMode>).detail;
      if (
        next === "INVESTOR" ||
        next === "SELLER" ||
        next === "BOTH" ||
        next === "LANDLORD"
      ) {
        setMode(next);
      }
    }
    window.addEventListener(VIEW_MODE_EVENT, onChange);
    return () => window.removeEventListener(VIEW_MODE_EVENT, onChange);
  }, []);

  if (userRole !== "BOTH" && userRole !== "BROKER") return null;

  function pick(next: ViewMode) {
    setMode(next);
    setViewMode(next);
  }

  return (
    <div
      role="tablist"
      aria-label="Sidebar-Modus"
      className="hidden md:inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs"
    >
      {OPTIONS.map((opt) => {
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
