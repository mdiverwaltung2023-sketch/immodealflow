import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Öffentliche Routes — alles andere ist geschützt
const isPublicRoute = createRouteMatcher([
  "/",
  "/mieten(.*)", // Phase L10 — Mieter-Landing-Page
  "/verkaufen(.*)", // Phase L11 — KI-Verkaufsberater
  "/offmarket-fuer-eigentuemer(.*)", // Phase F — Offmarket-Akquise-Landing (eBay-Verkaeufer-Gespraeche)
  "/zugang(.*)", // Phase M2 — Token-Freigabe-Page fuer Kaufinteressenten (kein Account noetig)
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/bookmarklet(.*)" // damit das Bookmarklet die Anleitungs-Seite ohne Login lesen kann; receive-Endpoint hat eigene Auth-Logik
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)"
  ]
};
