import "./globals.css";
import type { ReactNode } from "react";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";
import { SideNav } from "@/components/SideNav";
import { TopBar } from "@/components/TopBar";

export const metadata = {
  title: "Infinity Oikos — Marketplace für MFH und Gewerbe",
  description:
    "Two-Sided Marketplace für Mehrfamilienhäuser und Gewerbe-Immobilien. Verkäufer sehen das Investor-Profil — Bonität, Trackrecord, Finanzierungsstatus."
};

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
          {/* Eingeloggte User: Sidebar-Shell mit TopBar */}
          <SignedIn>
            <div className="flex min-h-screen bg-zinc-50">
              <SideNav />
              <div className="flex min-w-0 flex-1 flex-col">
                <TopBar />
                <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
                  <div className="mx-auto max-w-7xl">{children}</div>
                </main>
                <footer className="border-t border-zinc-200 bg-white px-4 py-4 lg:px-8 text-xs text-zinc-500">
                  Infinity Oikos · Marketplace für MFH und Gewerbe ·{" "}
                  <a href="mailto:info@infinityoikos.com" className="underline hover:text-zinc-700">
                    info@infinityoikos.com
                  </a>
                </footer>
              </div>
            </div>
          </SignedIn>

          {/* Pre-Auth (Landing, Sign-in, Sign-up): Vollbild ohne Shell */}
          <SignedOut>{children}</SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
