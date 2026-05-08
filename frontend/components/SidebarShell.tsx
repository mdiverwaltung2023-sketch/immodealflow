import type { ReactNode } from "react";
import { MeSchema, type UserPlanT, type UserRoleT } from "@/lib/api";
import { apiGet } from "@/lib/api-server";
import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";

/**
 * Server-Wrapper für die App-Shell. Holt /me einmal pro Render und
 * übergibt Rolle + Plan an SideNav + TopBar.
 *
 * Falls /me 401/Fehler liefert (z. B. Token kurz weg), fallen wir auf
 * Rolle "BOTH" / Plan "FREE" zurück — dann sieht der User alles, und
 * der nächste Klick führt ihn ggf. ins Onboarding.
 */
export async function SidebarShell({ children }: { children: ReactNode }) {
  const me = await apiGet("/me", MeSchema).catch(() => null);
  const userRole: UserRoleT = me?.role ?? "BOTH";
  const plan: UserPlanT = me?.plan ?? "FREE";

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <SideNav userRole={userRole} plan={plan} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userRole={userRole} plan={plan} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
        <footer className="border-t border-zinc-200 bg-white px-4 py-4 lg:px-8 text-xs text-zinc-500">
          Infinity Oikos · Marketplace für MFH und Gewerbe ·{" "}
          <a href="mailto:info@infinityoikos.com" className="underline hover:text-zinc-700">
            info@infinityoikos.com
          </a>
        </footer>
      </div>
    </div>
  );
}
