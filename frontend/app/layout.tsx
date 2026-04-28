import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "DealFlow AI",
  description: "MVP: Immobilien-Deals analysieren und Angebote generieren"
};

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900 hover:text-white"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-10 border-b bg-zinc-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
                <div className="leading-tight">
                  <div className="text-sm font-semibold">DealFlow AI</div>
                  <div className="text-xs text-zinc-400">MVP</div>
                </div>
              </Link>
              <nav className="flex items-center gap-1">
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/auctions">Versteigerungen</NavLink>
                <NavLink href="/new">Neues Objekt</NavLink>
                <NavLink href="/bookmarklet">Bookmarklet</NavLink>
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

          <footer className="border-t">
            <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-zinc-500">
              DealFlow AI • End-to-End MVP (ohne Auth)
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

