"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo, BrandWordmark } from "@/components/BrandLogo";
import { PlanBadge } from "@/components/PlanBadge";
import type { UserPlanT, UserRoleT } from "@/lib/api";
import {
  VIEW_MODE_EVENT,
  defaultModeForRole,
  getAllowedModes,
  readViewModeFor,
  type ViewMode
} from "@/components/viewMode";

type Item = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

type Section = {
  id:
    | "overview"
    | "investor"
    | "financing"
    | "coinvest"
    | "seller"
    | "landlord"
    | "rentSearch"
    | "offmarketSeller"
    | "offmarketInvestor"
    | "account"
    | "admin";
  title: string;
  items: Item[];
  /** Optionaler Farb-Akzent fuer hervorgehobene Sektionen */
  accent?: "offmarket" | "capital" | "coinvest";
};

/** Akzent-Styles fuer hervorgehobene Sektionen (Offmarket=Gold, Capital=Gruen). */
const ACCENTS = {
  offmarket: {
    wrap: "rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-50/60 to-white px-1 py-2",
    title: "px-3 mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700",
    dot: "bg-amber-500",
    dotShadow: "0 0 6px 1px rgba(245, 158, 11, 0.5)",
    itemActive: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-amber-100/80 text-amber-900",
    itemIdle: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-amber-50 hover:text-amber-900",
    iconActive: "text-amber-600",
    iconIdle: "text-amber-500/80"
  },
  capital: {
    wrap: "rounded-xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/60 to-white px-1 py-2",
    title: "px-3 mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700",
    dot: "bg-emerald-500",
    dotShadow: "0 0 6px 1px rgba(16, 185, 129, 0.5)",
    itemActive: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-emerald-100/80 text-emerald-900",
    itemIdle: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-emerald-50 hover:text-emerald-900",
    iconActive: "text-emerald-600",
    iconIdle: "text-emerald-500/80"
  },
  coinvest: {
    wrap: "rounded-xl border border-teal-300/70 bg-gradient-to-b from-teal-50/80 to-white px-1 py-2 shadow-sm",
    title: "px-3 mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700",
    dot: "bg-teal-500",
    dotShadow: "0 0 6px 1px rgba(20, 184, 166, 0.55)",
    itemActive: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-teal-100/80 text-teal-900",
    itemIdle: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-teal-50 hover:text-teal-900",
    iconActive: "text-teal-600",
    iconIdle: "text-teal-500/80"
  }
} as const;

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
const IcBriefcase = (
  <Icon>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
    <path d="M3 12h18" />
  </Icon>
);
const IcKey = (
  <Icon>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9" />
    <path d="M16 7l3 3" />
  </Icon>
);
const IcLock = (
  <Icon>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </Icon>
);
const IcRadar = (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <path d="M12 3v4" />
  </Icon>
);
const IcEnvelope = (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 7 9-7" />
  </Icon>
);
const IcBuildings = (
  <Icon>
    <rect x="3" y="9" width="8" height="12" rx="1" />
    <path d="M11 21h10V4a1 1 0 00-1-1h-7a1 1 0 00-1 1v5" />
    <path d="M6 13h2M6 17h2M15 7h2M15 11h2M15 15h2" />
  </Icon>
);
const IcBank = (
  <Icon>
    <path d="M3 10l9-6 9 6" />
    <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
    <path d="M3 21h18" />
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
    { href: "/empfangene-freigaben", label: "Erhaltene Unterlagen", icon: IcInbox },
    { href: "/auctions", label: "Versteigerungen", icon: IcGavel },
    { href: "/new", label: "Objekt beobachten", icon: IcChart },
    { href: "/bookmarklet", label: "Bookmarklet", icon: IcBookmark }
  ]
};

// --- Phase N — Oikos Capital Layer ----------------------------------
// Eigene, gruen akzentuierte Sektion. Die Finanzierung soll als
// eigenstaendige Saeule sichtbar sein, nicht als Unterpunkt.
const SECTION_FINANCING: Section = {
  id: "financing",
  title: "Finanzierung · Capital Layer",
  accent: "capital",
  items: [
    { href: "/finanzierung", label: "Finanzierungs-Cockpit", icon: IcBank, exact: true }
  ]
};

// --- Phase Q — Co-Investment Hub -----------------------------------
// Eigene, teal akzentuierte Saeule. Partnersuche fuer Co-Investments
// soll als eigenstaendiger Bereich sichtbar sein, nicht als Unterpunkt.
const SECTION_COINVEST: Section = {
  id: "coinvest",
  title: "Co-Investment · Partner finden",
  accent: "coinvest",
  items: [
    { href: "/co-investments", label: "Co-Investment-Marktplatz", icon: IcBuildings, exact: true },
    { href: "/co-investments/neu", label: "Gesuch anlegen", icon: IcPlus },
    { href: "/co-investments/meine", label: "Meine Gesuche", icon: IcList }
  ]
};

const SECTION_SELLER: Section = {
  id: "seller",
  title: "Als Verkäufer (anbieten)",
  items: [
    { href: "/listings", label: "Meine Inserate", icon: IcList },
    { href: "/listings/new", label: "Inserat anlegen", icon: IcPlus },
    { href: "/sales", label: "Verkaufsabwicklung", icon: IcBriefcase },
    { href: "/freigaben", label: "Dokumenten-Freigaben", icon: IcInbox }
  ]
};

const SECTION_LANDLORD: Section = {
  id: "landlord",
  title: "Als Vermieter (vermieten)",
  items: [
    { href: "/rentals", label: "Mietobjekte", icon: IcKey },
    { href: "/rentals/new", label: "Mietobjekt anlegen", icon: IcPlus }
  ]
};

const SECTION_RENT_SEARCH: Section = {
  id: "rentSearch",
  title: "Wohnung mieten (suchen)",
  items: [
    { href: "/rental-marketplace", label: "Mietbörse", icon: IcStore },
    { href: "/me/applications-sent", label: "Meine Bewerbungen", icon: IcInbox }
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
  items: [
    { href: "/admin/coins", label: "Coin-Dashboard", icon: IcShield },
    { href: "/admin/broker-leads", label: "Makler-Leads", icon: IcInbox },
    { href: "/admin/financing-partners", label: "Finanzierungspartner", icon: IcBank },
    { href: "/admin/financing-leads", label: "Finanzierungs-Leads", icon: IcInbox }
  ]
};

// --- Phase F (Offmarket-Layer) --------------------------------------
//
// Eigene Sektion mit goldenem Akzent — der Begriff "Offmarket" zieht
// sich bewusst durch alle Items als Markenversprechen + Lead-Magnet
// fuer eBay-Verkaufsgespraeche.

const SECTION_OFFMARKET_SELLER: Section = {
  id: "offmarketSeller",
  title: "Offmarket · diskret verkaufen",
  accent: "offmarket",
  items: [
    { href: "/offmarket", label: "Offmarket-Hub", icon: IcLock, exact: true },
    { href: "/offmarket/leads", label: "Meine Offmarket-Inserate", icon: IcList },
    { href: "/offmarket/leads/neu", label: "Offmarket-Inserat anlegen", icon: IcPlus },
    { href: "/offmarket/investoren", label: "Investoren entdecken", icon: IcRadar }
  ]
};

const SECTION_OFFMARKET_INVESTOR: Section = {
  id: "offmarketInvestor",
  title: "Offmarket · Vorab-Zugang",
  accent: "offmarket",
  items: [
    { href: "/offmarket", label: "Offmarket-Hub", icon: IcLock, exact: true },
    { href: "/offmarket/einladungen", label: "Offmarket-Einladungen", icon: IcEnvelope }
  ]
};

/**
 * Phase L7 — saubere Trennung pro View-Mode. Jede View hat genau EINE
 * Rollen-Sektion (Investor / Verkäufer / Vermieter / Mieter) plus
 * Übersicht + Konto. Verkäufer sieht KEINE Vermiet- oder Miet-Features,
 * Investor ebenso, etc.
 *
 * Multi-Rollen (BOTH, BROKER) wechseln über den TopBar-Toggle zwischen
 * den für ihre Rolle erlaubten Sichten.
 */
function sectionsForMode(mode: ViewMode): Section[] {
  // Offmarket-Sektion wird parallel zum jeweiligen Haupt-Workflow
  // eingeblendet: Investor -> Vorab-Zugang, Verkaeufer -> diskret verkaufen.
  // Vermieter/Mieter sehen Offmarket nicht (passt nicht zum Use-Case).
  switch (mode) {
    case "INVESTOR":
      return [
        SECTION_OVERVIEW,
        SECTION_INVESTOR,
        SECTION_COINVEST,
        SECTION_FINANCING,
        SECTION_OFFMARKET_INVESTOR,
        SECTION_ACCOUNT
      ];
    case "SELLER":
      return [
        SECTION_OVERVIEW,
        SECTION_SELLER,
        SECTION_OFFMARKET_SELLER,
        SECTION_ACCOUNT
      ];
    case "LANDLORD":
      return [SECTION_OVERVIEW, SECTION_LANDLORD, SECTION_ACCOUNT];
    case "TENANT":
      return [SECTION_OVERVIEW, SECTION_RENT_SEARCH, SECTION_ACCOUNT];
  }
}

function getVisibleSections(role: UserRoleT, mode: ViewMode, isAdmin: boolean): Section[] {
  const base = sectionsForMode(mode);
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
  const allowed = getAllowedModes(userRole);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultModeForRole(userRole));
  const [hydrated, setHydrated] = useState(false);

  // ViewMode aus localStorage initialisieren + auf Toggle-Events hören.
  // Multi-Rollen wechseln dynamisch; reine Rollen haben einen einzigen Mode
  // und ignorieren externe Events.
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

  // Vor Hydration: nutze den Default-Mode der Rolle (Sub-View ist klar bestimmt).
  const effectiveMode = hydrated ? viewMode : defaultModeForRole(userRole);
  const sections = getVisibleSections(userRole, effectiveMode, isAdmin);

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 lg:border-r lg:border-zinc-200 lg:bg-white">
      <Link
        href="/dashboard"
        className="flex flex-col items-center gap-1 px-4 py-5 border-b border-zinc-200"
      >
        <BrandLogo width={170} />
        <BrandWordmark size="md" />
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section) => {
          const acc = section.accent ? ACCENTS[section.accent] : null;
          return (
            <div key={section.id} className={acc ? acc.wrap : undefined}>
              <div
                className={
                  acc
                    ? acc.title
                    : "px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400"
                }
              >
                {acc ? (
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${acc.dot}`}
                    style={{ boxShadow: acc.dotShadow }}
                  />
                ) : null}
                <span>{section.title}</span>
              </div>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(pathname, item);
                  if (acc) {
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={active ? acc.itemActive : acc.itemIdle}
                        >
                          <span className={active ? acc.iconActive : acc.iconIdle}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  }
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={
                          active
                            ? 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-indigo-50 text-indigo-700'
                            : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                        }
                      >
                        <span className={active ? 'text-indigo-600' : 'text-zinc-400'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 px-4 py-4">
        {plan === 'FREE' ? (
          <Link
            href="/pricing"
            className="block rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 p-3 text-white shadow-sm transition hover:shadow-md"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
              Beobachter
            </div>
            <div className="mt-0.5 text-sm font-semibold">Investor Club starten</div>
            <div className="mt-1 text-[10px] text-indigo-100/90">
              Offmarket-Vorsprung KI-Bietlimit 19 EUR pro Monat
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
          (c) {new Date().getFullYear()} Infinity Oikos
        </div>
      </div>
    </aside>
  );
}
