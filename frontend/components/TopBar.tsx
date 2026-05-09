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
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <BrandLogo size={32} variant="warm" />
          <span className="font-serif text-sm font-bold tracking-[0.18em] text-amber-700">
            INFINITY{" "}
            <span className="text-[11px] tracking-[0.3em] text-amber-600">OIKOS</span>
          </span>
        </Link>

        {/* ViewModeToggle: zentriert, nur für BOTH */}
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
      {userRole === "BOTH" ? (
        <div className="flex justify-center border-t border-zinc-100 bg-white/85 py-2 lg:hidden">
          <ViewModeToggle userRole={userRole} />
        </div>
      ) : null}
    </header>
  );
}

function RoleBadge({ role }: { role: UserRoleT }) {
  const label =
    role === "INVESTOR" ? "Investor" : role === "SELLER" ? "Verkäufer" : "Investor + Verkäufer";
  const tone =
    role === "INVESTOR"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : role === "SELLER"
      ? "bg-amber-50 text-amber-800 border-amber-200"
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
