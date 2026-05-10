"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Phase L11.4 — Layout-Switch im Root-Layout.
 *
 * Marketing-Pages (/, /mieten, /verkaufen) sollen IMMER ohne App-
 * Shell rendern — auch fuer eingeloggte User. Das verhindert die
 * doppelte Navigation (TopBar/Sidebar PLUS MarketingNav).
 *
 * Alle anderen Pages laufen weiter wie bisher: eingeloggt -^> Shell,
 * ausgeloggt -^> nackt.
 */
const MARKETING_PATHS = ["/mieten", "/verkaufen"];

function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return MARKETING_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function ConditionalShell({
  marketingChildren,
  defaultChildren
}: {
  /** Rendert auf Marketing-Pages (volle Breite, keine App-Shell) */
  marketingChildren: ReactNode;
  /** Rendert sonst (eingeloggt: SidebarShell, ausgeloggt: nackt) */
  defaultChildren: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  return <>{isMarketingPath(pathname) ? marketingChildren : defaultChildren}</>;
}
