import { clerkMiddleware } from "@clerk/nextjs/server";

// In Push A1 läuft die Middleware, aber **schützt noch keine Routes**.
// Ziel: Sign-in/Sign-up funktionieren, UserButton zeigt eingeloggten User —
// alle bestehenden Routes (Dashboard, Auctions, …) bleiben offen, damit ein
// Bug im Login keine Live-App lahmlegt. In Push A2 erweitern wir das hier
// um createRouteMatcher + auth().protect() für die privaten Bereiche.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Alle Pfade außer Static und _next
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)"
  ]
};
