"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Topbar oben in der eingeloggten App-Shell.
 * Auf mobile zeigt sie zusätzlich Logo (weil dann Sidebar ausgeblendet ist).
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="flex items-center justify-between px-4 lg:px-8 h-14">
        {/* Logo nur auf Mobile sichtbar */}
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <BrandLogo size={28} />
          <span className="text-sm font-semibold text-zinc-900">Infinity Oikos</span>
        </Link>

        {/* Page-Title-Slot — leer, weil jede Page ihren eigenen Header rendert */}
        <div className="hidden lg:block" />

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live
          </span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
