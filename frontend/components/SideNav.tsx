"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo, BrandWordmark } from "@/components/BrandLogo";
import { PlanBadge } from "@/components/PlanBadge";
import type { UserPlanT, UserRoleT } from "@/lib/api";
import { VIEW_MODE_STORAGE_KEY, VIEW_MODE_EVENT, type ViewMode } from "@/components/viewMode";

type Item = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

type Section = {
  id: "overview" | "investor" | "seller" | "account" | "admin";
  title: string;
  items: Item[];
};

/* ---------- Mini-Icon-Set (inline SVGs) ---------- */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}
const IcHome = (
  <Icon>
    <path d="M3 12 12 4l9 8" />
    <path d="M5 10v10h14V10" />
  </Icon>
);
const IcStore = (
  <Icon>
    <path d="M3 9l1.5-5h15L21 9" />
    <path d="M4 9v11h16V9" />
    <path d="M9 20v-6h6v6" />
  </Icon>
);
const IcInbox = (
  <Icon>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5 4h14l3 8v8H2v-8z" />
  </Icon>
);
const IcGavel = (
  <Icon>
    <path d="M14 14l6 6" />
    <path d="M5 13l6-6" />
    <path d="M9 3l8 8" />
    <path d="M3 21h8" />
  </Icon>
);
const IcList = (
  <Icon>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </Icon>
);
const IcPlus = (
  <Icon>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);
const IcUser = (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
  </Icon>
);
const IcBookmark = (
  <Icon>
    <path d="M6 3h12v18l-6-4-6 4z" />
  </Icon>
);
const IcChart = (
  <Icon>
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 4 4 5-7" />
  </Icon>
);
const IcSparkle = (
  <Icon>
    <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
  </Icon>
);
const IcCoin = (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9.5h4.5a2 2 0 010 4H9.5a2 2 0 000 4H14" />
  </Icon>
);
const IcShield = (
  <Icon>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icon>
);

/* ---------- Sektionen ---------- */

const SECTION_OVERVIEW: Section = {
  id: "overview",
  title: "Übersicht",
  items: [{ href: "/dashboard", label: "Dashboard", icon: IcHome, exact: true }]
};

const SECTION_INVESTOR: Section = {
  id: "investor",
  title: "Als Investor (kaufen)",
  items: [
    { href: "/marketplace", label: "Marketplace", icon: IcStore },
    { href: "/inquiries", label: "Meine Anfragen", icon: IcInbox },
    { href: "/auctions", label: "Versteigerungen", icon: IcGavel },
    { href: "/new", label: "Objekt beobachten", icon: IcChart },
    { href: "/bookmarklet", label: "Bookmarklet", icon: IcBookmark }
  ]
};

const SECTION_SELLER: Section = {
  id: "seller",
  title: "Als Verkäufer (anbieten)",
  items: [
    { href: "/listings", label: "Meine Inserate", icon: IcList },
    { href: "/listings/new", label: "Inserat anlegen", icon: IcPlus }
  ]
};

const SECTION_ACCOUNT: Section = {
  id: "account",
  title: "Konto",
  items: [
    { href: "/profile", label: "Profil", icon: IcUser },
    { href: "/coins", label: "Meine Coins", icon: IcCoin },
    { href: "/pricing", label: "Tarife", icon: IcSparkle }
  ]
};

const SECTION_ADMIN: Section = {
  id: "admin",
  title: "Admin",
  items: [{ href: "/admin/coins", label: "Coin-Dashboard", icon: IcShield }]
};

/**
 * Sektionen je nach (Rolle × ViewMode):
 * - INVESTOR -> Übersicht + Investor + Konto
 * - SELLER   -> Übersicht + Verkäufer + Konto
 * - BOTH + viewMode "BOTH"     -> alle 4
 * - BOTH + viewMode "INVESTOR" -> Übersicht + Investor + Konto
 * - BOTH + viewMode "SELLER"   -> Übersicht + Verkäufer + Konto
 */
function getVisibleSections(role: UserRoleT, mode: ViewMode, isAdmin: boolean): Section[] {
  let base: Section[];
  if (role === "INVESTOR" || (role === "BOTH" && mode === "INVESTOR")) {
    base = [SECTION_OVERVIEW, SECTION_INVESTOR, SECTION_ACCOUNT];
  } else if (role === "SELLER" || (role === "BOTH" && mode === "SELLER")) {
    base = [SECTION_OVERVIEW, SECTION_SELLER, SECTION_ACCOUNT];
  } else {
    base = [SECTION_OVERVIEW, SECTION_INVESTOR, SECTION_SELLER, SECTION_ACCOUNT];
  }
  return isAdmin ? [...base, SECTION_ADMIN] : base;
}

function isActive(pathname: string, item: Item): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function SideNav({
  userRole,
  plan,
  isAdmin = false
}: {
  userRole: UserRoleT;
  plan: UserPlanT;
  isAdmin?: boolean;
}) {
  const pathname = usePathname() || "/";
  const [viewMode, setViewMode] = useState<ViewMode>("BOTH");
  const [hydrated, setHydrated] = useState(false);

  // ViewMode aus localStorage initialisieren + auf Toggle-Events hören
  useEffect(() => {
    setHydrated(true);
    if (userRole !== "BOTH") {
      // Reine Investoren/Verkäufer haben keinen Modus zum Wechseln
      return;
    }
    try {
      const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === "INVESTOR" || saved === "SELLER" || saved === "BOTH") {
        setViewMode(saved);
      }
    } catch {
      // localStorage kann blockiert sein — egal, dann Default
    }

    function onChange(e: Event) {
      const detail = (e as CustomEvent<ViewMode>).detail;
      if (detail === "INVESTOR" || detail === "SELLER" || detail === "BOTH") {
        setViewMode(detail);
      }
    }
    window.addEventListener(VIEW_MODE_EVENT, onChange);
    return () => window.removeEventListener(VIEW_MODE_EVENT, onChange);
  }, [userRole]);

  // Vor Hydration: nutze die Server-Default-Variante (BOTH-View) damit kein
  // Layout-Shift entsteht, der schlimmer wäre als die kurze Anzeige aller Items.
  const sections = getVisibleSections(userRole, hydrated ? viewMode : "BOTH", isAdmin);

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 lg:border-r lg:border-zinc-200 lg:bg-white">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-4 py-5 border-b border-zinc-200"
      >
        <BrandLogo size={42} variant="warm" />
        <div className="flex flex-col items-start leading-none">
          <BrandWordmark width={130} variant="warm" />
          <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-zinc-500">
            MFH · Gewerbe
          </div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {section.title}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        active
                          ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-indigo-50 text-indigo-700"
                          : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      }
                    >
                      <span className={active ? "text-indigo-600" : "text-zinc-400"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Plan-Block am Sidebar-Footer: Free zeigt CTA, Pro zeigt Badge */}
      <div className="border-t border-zinc-200 px-4 py-4">
        {plan === "FREE" ? (
          <Link
            href="/pricing"
            className="block rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 p-3 text-white shadow-sm transition hover:shadow-md"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
              Free-Plan
            </div>
            <div className="mt-0.5 text-sm font-semibold">Auf Pro upgraden →</div>
            <div className="mt-1 text-[10px] text-indigo-100/90">
              Off-Market, KI-Tools, Verifiziert-Badge
            </div>
          </Link>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Aktueller Plan
              </div>
              <div className="mt-1">
                <PlanBadge plan={plan} size="md" asLink={false} />
              </div>
            </div>
            <Link
              href="/profile"
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
            >
              Verwalten
            </Link>
          </div>
        )}
        <div className="mt-3 text-[10px] text-zinc-400">
          © {new Date().getFullYear()} Infinity Oikos
        </div>
      </div>
    </aside>
  );
}
