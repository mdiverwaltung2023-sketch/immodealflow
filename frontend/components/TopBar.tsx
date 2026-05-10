"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { BrandLogo } from "@/components/BrandLogo";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { PlanBadge } from "@/components/PlanBadge";
import type { UserPlanT, UserRoleT } from "@/lib/api";

/**
 * Topbar oben in der eingeloggten App-Shell.
 * Auf mobile zeigt sie zusätzlich Logo (weil dann Sidebar ausgeblendet ist).
 * Bei Rolle BOTH erscheint zusätzlich der Sidebar-Modus-Toggle.
 * Plan-Badge rechts neben dem Rollen-Badge — Free klickbar zur Pricing-Page.
 */
export function TopBar({
  userRole,
  plan
}: {
  userRole: UserRoleT;
  plan: UserPlanT;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="flex items-center justify-between px-4 lg:px-8 h-14 gap-3">
        {/* Logo nur auf Mobile sichtbar */}
        <Link href="/dashboard" className="flex flex-col items-center gap-0 lg:hidden">
          <BrandLogo width={120} />
          <span className="font-serif text-[10px] font-semibold tracking-[0.4em] bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-violet-700">
            OIKOS
          </span>
        </Link>

        {/* ViewModeToggle: zentriert, nur fuer Multi-Rollen (BOTH, BROKER) */}
        <div className="hidden lg:flex flex-1 justify-center">
          <ViewModeToggle userRole={userRole} />
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex">
            <PlanBadge plan={plan} />
          </span>
          <RoleBadge role={userRole} />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      {/* Mobile-Toggle separat unter Header (auf grossen Screens schon im flex zentriert) */}
      {userRole === "BOTH" || userRole === "BROKER" ? (
        <div className="flex justify-center border-t border-zinc-100 bg-white/85 py-2 lg:hidden">
          <ViewModeToggle userRole={userRole} />
        </div>
      ) : null}
    </header>
  );
}

function RoleBadge({ role }: { role: UserRoleT }) {
  const label =
    role === "INVESTOR"
      ? "Investor"
      : role === "SELLER"
      ? "Verkäufer"
      : role === "LANDLORD"
      ? "Vermieter"
      : role === "TENANT"
      ? "Mieter"
      : role === "BROKER"
      ? "Makler"
      : "Mehrere Rollen";
  const tone =
    role === "INVESTOR"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : role === "SELLER"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : role === "LANDLORD"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : role === "TENANT"
      ? "bg-cyan-50 text-cyan-700 border-cyan-200"
      : role === "BROKER"
      ? "bg-violet-50 text-violet-700 border-violet-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <span
      className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${tone}`}
      title={`Deine Rolle aus dem Onboarding: ${label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
