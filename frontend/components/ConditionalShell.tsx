"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const MARKETING_PATHS = [
  "/mieten",
  "/verkaufen",
  "/offmarket-fuer-eigentuemer",
  "/zugang"
];

function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  for (const p of MARKETING_PATHS) {
    if (pathname === p || pathname.startsWith(p + "/")) return true;
  }
  return false;
}

export function ConditionalShell({
  marketingChildren,
  defaultChildren
}: {
  marketingChildren: ReactNode;
  defaultChildren: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isMarketing = isMarketingPath(pathname);
  return <>{isMarketing ? marketingChildren : defaultChildren}</>;
}
