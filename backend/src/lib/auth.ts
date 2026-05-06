import { createClerkClient, verifyToken } from "@clerk/backend";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "./prisma.js";

declare global {
  namespace Express {
    interface Request {
      // Unsere DB-User-ID (cuid). Verfügbar nach requireAuth.
      userId?: string;
      // Die Clerk-User-ID. Verfügbar nach requireAuth.
      clerkUserId?: string;
    }
  }
}

const clerk = (() => {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    // Soft-fail: nur Warning, damit der Health-Check nicht stirbt, falls
    // die Variable beim Boot noch nicht da ist. Die Middleware wirft dann.
    console.warn("CLERK_SECRET_KEY fehlt — Authentifizierung wird nicht funktionieren");
    return null;
  }
  return createClerkClient({ secretKey: key });
})();

/**
 * Express-Middleware. Verifiziert das Bearer-Token im Authorization-Header,
 * legt den User in unserer DB an (Just-in-Time-Provisioning) wenn nötig
 * und hängt `req.userId` + `req.clerkUserId` an das Request-Objekt.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: "Backend ist nicht konfiguriert (CLERK_SECRET_KEY fehlt)" });
  }
  if (!clerk) {
    return res.status(500).json({ error: "Clerk-Client nicht initialisiert" });
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.slice(7).trim();

  let clerkUserId: string;
  try {
    const payload = await verifyToken(token, { secretKey });
    if (!payload.sub) throw new Error("token without sub");
    clerkUserId = payload.sub;
  } catch (e) {
    return res.status(401).json({
      error: "Invalid token",
      details: e instanceof Error ? e.message : String(e)
    });
  }

  // Just-in-Time-Provisioning: Existiert der User bereits in unserer DB?
  let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
  if (!user) {
    try {
      const clerkUser = await clerk.users.getUser(clerkUserId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email,
          name
        }
      });
    } catch (e) {
      return res.status(500).json({
        error: "User-Provisioning fehlgeschlagen",
        details: e instanceof Error ? e.message : String(e)
      });
    }
  }

  req.userId = user.id;
  req.clerkUserId = clerkUserId;
  next();
}
