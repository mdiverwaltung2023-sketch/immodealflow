"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserRoleT } from "@/lib/api";
import {
  VIEW_MODE_EVENT,
  defaultModeForRole,
  getAllowedModes,
  readViewModeFor,
  type ViewMode
} from "@/components/viewMode";

/**
 * Phase L8 — entscheidet je nach effective ViewMode, welches Profil
 * sichtbar ist:
 *  - INVESTOR / SELLER / LANDLORD / BROKER  -> Investor-Profil
 *  - TENANT                                 -> Mieter-Profil
 *
 * Reine Mieter sehen nur den Mieter-Block. Reine Investoren / Verkäufer
 * / Vermieter sehen nur das Investor-Profil. Multi-Rollen wechseln
 * über den TopBar-Toggle und sehen jeweils das passende Profil.
 *
 * Zusätzlicher Hinweis-Banner: "Du kannst auch das andere Profil
 * pflegen — wechsel oben den Modus."
 */
export function ProfileSwitcher({
  userRole,
  investorEditor,
  tenantEditor
}: {
  userRole: UserRoleT;
  investorEditor: ReactNode;
  tenantEditor: ReactNode;
}) {
  const allowed = useMemo(() => getAllowedModes(userRole), [userRole]);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultModeForRole(userRole));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setViewMode(readViewModeFor(userRole));

    function onChange(e: Event) {
      const detail = (e as CustomEvent<ViewMode>).detail;
      if (allowed.includes(detail)) setViewMode(detail);
    }
    window.addEventListener(VIEW_MODE_EVENT, onChange);
    return () => window.removeEventListener(VIEW_MODE_EVENT, onChange);
  }, [userRole, allowed]);

  const effectiveMode = hydrated ? viewMode : defaultModeForRole(userRole);
  const showTenant = effectiveMode === "TENANT";
  const isMultiRole = allowed.length > 1;

  return (
    <div className="space-y-6">
      {isMultiRole ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-900">
          {showTenant ? (
            <>
              Aktive Sicht: <strong>Mieter</strong>. Du siehst dein
              Mieter-Profil. Wechsel oben in der Topbar zu Investor /
              Verkäufer / Vermieter, um dein Investor-Profil zu pflegen.
            </>
          ) : (
            <>
              Aktive Sicht:{" "}
              <strong>
                {effectiveMode === "INVESTOR"
                  ? "Investor"
                  : effectiveMode === "SELLER"
                  ? "Verkäufer"
                  : "Vermieter"}
              </strong>
              . Du siehst dein Investor-/Verkäufer-Profil. Wechsel oben in
              der Topbar zu „Mieter", um dein Mieter-Profil zu pflegen.
            </>
          )}
        </div>
      ) : null}

      {showTenant ? tenantEditor : investorEditor}
    </div>
  );
}
