import "./globals.css";
import type { ReactNode } from "react";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";
import { SidebarShell } from "@/components/SidebarShell";
import { ReferralCapture } from "@/components/ReferralCapture";

export const metadata = {
  title: "Infinity Oikos — Marketplace für Investoren und Verkäufer",
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
          {/* Phase H7: Referral-Capture aus ?ref=... in localStorage */}
          <ReferralCapture />

          {/* Eingeloggte User: rollenabhängige Sidebar-Shell */}
          <SignedIn>
            <SidebarShell>{children}</SidebarShell>
          </SignedIn>

          {/* Pre-Auth (Landing, Sign-in, Sign-up): Vollbild ohne Shell */}
          <SignedOut>{children}</SignedOut>
        </body>
      </html>
    </ClerkProvider>
  );
}
