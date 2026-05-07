import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#6366f1", // indigo-500, passt zu unserem UI
          colorBackground: "#09090b", // zinc-950
          colorText: "#f4f4f5", // zinc-100
          colorInputBackground: "#18181b", // zinc-900
          colorInputText: "#f4f4f5"
        }
      }}
    >
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
                  <NavLink href="/marketplace">Marketplace</NavLink>
                  <NavLink href="/listings">Meine Listings</NavLink>
                  <NavLink href="/auctions">Versteigerungen</NavLink>
                  <NavLink href="/new">Neues Objekt</NavLink>
                  <NavLink href="/profile">Profil</NavLink>
                  <NavLink href="/bookmarklet">Bookmarklet</NavLink>
                  <div className="ml-2 flex items-center gap-2">
                    <SignedOut>
                      <SignInButton mode="modal">
                        <button className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900 hover:text-white">
                          Anmelden
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-600">
                          Registrieren
                        </button>
                      </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                      <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                  </div>
                </nav>
              </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

            <footer className="border-t">
              <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-zinc-500">
                DealFlow AI • Investor- und Verkäufer-Tool für MFH/Gewerbe
              </div>
            </footer>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
