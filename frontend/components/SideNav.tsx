"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";

type Item = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

type Section = {
  title: string;
  items: Item[];
};

/* ---------- Mini-Icon-Set (inline SVGs, keine Library nötig) ---------- */

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

const SECTIONS: Section[] = [
  {
    title: "Übersicht",
    items: [{ href: "/dashboard", label: "Dashboard", icon: IcHome, exact: true }]
  },
  {
    title: "Marktplatz",
    items: [
      { href: "/marketplace", label: "Marketplace", icon: IcStore },
      { href: "/inquiries", label: "Anfragen", icon: IcInbox },
      { href: "/auctions", label: "Versteigerungen", icon: IcGavel }
    ]
  },
  {
    title: "Meine Objekte",
    items: [
      { href: "/listings", label: "Meine Listings", icon: IcList },
      { href: "/new", label: "Neues Objekt", icon: IcPlus }
    ]
  },
  {
    title: "Konto",
    items: [
      { href: "/profile", label: "Profil", icon: IcUser },
      { href: "/bookmarklet", label: "Bookmarklet", icon: IcBookmark }
    ]
  }
];

function isActive(pathname: string, item: Item): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function SideNav() {
  const pathname = usePathname() || "/";

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 lg:border-r lg:border-zinc-200 lg:bg-white">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-5 py-5 border-b border-zinc-200"
      >
        <BrandLogo size={36} />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-zinc-900">Infinity Oikos</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            MFH · Gewerbe
          </div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
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

      <div className="border-t border-zinc-200 px-5 py-4 text-[11px] text-zinc-400">
        © {new Date().getFullYear()} Infinity Oikos
      </div>
    </aside>
  );
}
