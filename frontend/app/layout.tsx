import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata = {
  title: "Infinity Oikos — Marketplace für MFH und Gewerbe",
  description:
    "Two-Sided Marketplace für Mehrfamilienhäuser und Gewerbe-Immobilien. Verkäufer sehen das Investor-Profil — Bonität, Trackrecord, Finanzierungsstatus."
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
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      appearance={{
        variables: {
          colorPrimary: "#4f46e5" // indigo-600
        }
      }}
    >
      <html lang="de">
        <body>
          {/* Eingeloggte User: globaler Header + Footer-Wrapper */}
          <SignedIn>
            <div className="min-h-screen">
              <header className="sticky top-0 z-10 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                  <Link href="/dashboard" className="flex items-center gap-3">
                    <BrandLogo size={36} />
                    <div className="leading-tight">
                      <div className="text-sm font-semibold text-white">Infinity Oikos</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                        MFH · Gewerbe · Marketplace
                      </div>
                    </div>
                  </Link>
                  <nav className="flex items-center gap-1">
                    <NavLink href="/dashboard">Dashboard</NavLink>
                    <NavLink href="/marketplace">Marketplace</NavLink>
                    <NavLink href="/listings">Meine Listings</NavLink>
                    <NavLink href="/inquiries">Anfragen</NavLink>
                    <NavLink href="/auctions">Versteigerungen</NavLink>
                    <NavLink href="/new">Neues Objekt</NavLink>
                    <NavLink href="/profile">Profil</NavLink>
                    <NavLink href="/bookmarklet">Bookmarklet</NavLink>
                    <div className="ml-2 flex items-center gap-2">
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </nav>
                </div>
              </header>

              <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

              <footer className="border-t border-zinc-900">
                <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-zinc-500">
                  Infinity Oikos • Investor- und Verkäufer-Tool für MFH/Gewerbe
                </div>
              </footer>
            </div>
          </SignedIn>

          {/* Pre-Auth Pages (Landing, Sign-in, Sign-up): kein Wrapper, Vollbildschirm */}
          <SignedOut>{children}</SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
