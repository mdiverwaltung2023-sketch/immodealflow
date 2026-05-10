import "./globals.css";
import type { ReactNode } from "react";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";
import { SidebarShell } from "@/components/SidebarShell";
import { ReferralCapture } from "@/components/ReferralCapture";
import { ConditionalShell } from "@/components/ConditionalShell";

export const metadata = {
  title: "Infinity Oikos — KI-gestützte Investmentplattform für Immobilien",
  description:
    "Off-Market-Vorsprung, KI-Bietlimit, AGG-konforme Mietsuche und neutraler Verkaufsberater. Verkäufer und Vermieter inserieren kostenlos."
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

          {/* Phase L11.4: Marketing-Pages (/, /mieten, /verkaufen) immer
              ohne App-Shell — auch fuer eingeloggte User. Sonst doppelte
              Navigation (Sidebar + MarketingNav). */}
          <ConditionalShell
            marketingChildren={children}
            defaultChildren={
              <>
                {/* Eingeloggte User: rollenabhängige Sidebar-Shell */}
                <SignedIn>
                  <SidebarShell>{children}</SidebarShell>
                </SignedIn>

                {/* Pre-Auth: Vollbild ohne Shell */}
                <SignedOut>{children}</SignedOut>
              </>
            }
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
