import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import Stripe from "stripe";
import { randomBytes } from "node:crypto";
import { prisma } from "./lib/prisma.js";
import {
  computeFullAnalysis,
  computeBidLimit,
  DEFAULT_ASSUMPTIONS,
  type AnalysisAssumptions
} from "./lib/calc.js";
import { computeFinancingReadiness } from "./lib/financing.js";
import {
  generateOfferWithClaude,
  extractPropertyFromText,
  extractAuctionFromText,
  extractAuctionListFromText,
  marketComparisonForProperty,
  analyzeListingMarket,
  evaluateBuyerOffer,
  evaluateRentalApplicant,
  refineSalesAdvice,
  type ListingMarketInput,
  type RentalUnitInput,
  type RentalApplicantInput,
  type SalesAdvisorRefineInput
} from "./lib/claude.js";
import { extractTextFromPdfBase64 } from "./lib/pdf.js";
import { requireAuth } from "./lib/auth.js";
import { verifyToken } from "@clerk/backend";
import {
  countActiveListings,
  countInquiriesLast30d,
  getPlanLimits,
  paywallBody,
  type PlanT
} from "./lib/billing.js";
import {
  earn,
  spend,
  todayUtcKey,
  isInvestorProfileCompleted,
  tryTriggerReferral,
  maybeMarkEarlyBird,
  listTransactions,
  listActiveSpends,
  getHighlightedListingIds,
  getFeedBoostedUserIds,
  isListingHighlighted,
  EARN_AMOUNTS,
  SPEND_COSTS,
  EARLY_BIRD_LIMIT,
  EARLY_BIRD_MULTIPLIER,
  type SpendKind
} from "./lib/coins.js";

// --- Stripe-Client (lazy, optional) ---
// Wenn STRIPE_SECRET_KEY fehlt, laufen Billing-Endpoints im Stub-Modus
// und antworten 503 mit klarer Meldung — App startet trotzdem.
const stripeSecret = process.env.STRIPE_SECRET_KEY;
// apiVersion bewusst NICHT setzen — Library nimmt ihren Default,
// was Type-Mismatches mit zukuenftigen API-Versionen vermeidet.
const stripe: Stripe | null = stripeSecret
  ? new Stripe(stripeSecret)
  : null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const STRIPE_PRICE_INVESTOR_MONTHLY = process.env.STRIPE_PRICE_INVESTOR_MONTHLY ?? "";
const STRIPE_PRICE_INVESTOR_YEARLY = process.env.STRIPE_PRICE_INVESTOR_YEARLY ?? "";
const STRIPE_PRICE_SELLER_MONTHLY = process.env.STRIPE_PRICE_SELLER_MONTHLY ?? "";
const STRIPE_PRICE_SELLER_YEARLY = process.env.STRIPE_PRICE_SELLER_YEARLY ?? "";
const STRIPE_PRICE_PREMIUM_LISTING = process.env.STRIPE_PRICE_PREMIUM_LISTING ?? "";

// Premium-Listing-Feature-Dauer in Tagen
const PREMIUM_LISTING_DAYS = 30;

const app = express();

// =========================================================
// Stripe-Webhook MUSS VOR express.json() registriert werden,
// weil die Signatur-Verifikation den unparsed Raw-Body braucht.
// =========================================================
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: "Stripe not configured" });
    }
    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string") return res.status(400).send("Missing signature");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      console.error("Stripe webhook signature failed:", msg);
      return res.status(400).send(`Webhook Error: ${msg}`);
    }

    try {
      await handleStripeEvent(event);
    } catch (err) {
      console.error("Stripe webhook handler failed:", err);
      // 200 trotzdem zurückgeben, sonst retried Stripe endlos. Wir haben den
      // Fehler in den Logs; manueller Fix per Customer Portal möglich.
    }
    return res.json({ received: true });
  }
);

app.use(express.json({ limit: "2mb" }));

// Standard-CORS: nur Vercel-Domain + localhost (FRONTEND_ORIGIN env)
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(",").map((s) => s.trim()) ?? true
  })
);

// Bookmarklet-CORS: offen für alle Origins, aber nur für die /import/*-Endpoints.
// Das Bookmarklet läuft auf der Origin der jeweiligen Inserate-Seite (Immoscout, DGA, …)
// und braucht daher Wildcard-Cors für genau diese drei Routen.
const bookmarkletCors = cors({ origin: "*", methods: ["POST", "OPTIONS"] });
app.options("/import/expose", bookmarkletCors);
app.options("/import/auction", bookmarkletCors);
app.options("/import/auction-list", bookmarkletCors);

app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Phase L11.2 — Public Sales-Advisor (Claude-Refinement) -----
// Kein requireAuth, weil die Landing-Page anonym aufrufbar sein soll.
// Schutz vor Missbrauch via simplem In-Memory-Rate-Limit pro IP:
// max 5 Requests / Stunde. Reset bei Container-Neustart ist OK.
const advisorRateLimit = new Map<string, { count: number; windowStart: number }>();
const ADVISOR_RATE_WINDOW_MS = 60 * 60 * 1000;
const ADVISOR_RATE_MAX = 5;

function advisorClientId(req: express.Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd[0]) return fwd[0];
  return req.ip ?? "unknown";
}

function advisorRateOk(req: express.Request): boolean {
  const id = advisorClientId(req);
  const now = Date.now();
  const entry = advisorRateLimit.get(id);
  if (!entry || now - entry.windowStart > ADVISOR_RATE_WINDOW_MS) {
    advisorRateLimit.set(id, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= ADVISOR_RATE_MAX) return false;
  entry.count += 1;
  return true;
}

const SalesAdvisorRefineSchema = z.object({
  city: z.string().min(1).max(120),
  assetType: z.enum(["ETW", "EFH", "MFH", "GEWERBE", "GRUNDSTUECK"]),
  locationQuality: z.enum(["TOP", "GUT", "MITTEL", "SCHWACH"]),
  area: z.number().min(1).max(100000),
  yearBuilt: z.number().int().min(1850).max(2030),
  condition: z.enum(["NEU", "GEPFLEGT", "SANIERUNGSBEDARF", "ABRISS"]),
  occupancy: z.enum(["LEERSTAND", "EIGEN", "VERMIETET"]),
  saleReason: z.enum(["FREIWILLIG", "ERBSCHAFT", "SCHEIDUNG", "FINANZIELL", "AUSWANDERUNG"]),
  timePressure: z.enum(["KEIN", "12M", "6M", "3M"]),
  experience: z.enum(["KEINE", "ETWAS", "VIEL"]),
  estimatedValue: z.number().int().min(0).max(100_000_000).optional(),
  heuristicScores: z.object({
    selbst: z.number().int().min(0).max(100),
    makler: z.number().int().min(0).max(100)
  }),
  heuristicRecommendation: z.enum(["SELBST", "MAKLER"])
});

app.post("/sales-advisor/refine", async (req, res) => {
  if (!advisorRateOk(req)) {
    return res.status(429).json({
      error: "rate_limit",
      message: "Zu viele Anfragen. Bitte später erneut versuchen (max. 5/Stunde)."
    });
  }
  try {
    const body = SalesAdvisorRefineSchema.parse(req.body);
    const refined = await refineSalesAdvice(body as SalesAdvisorRefineInput);
    return res.json(refined);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    return res.status(400).json({ error: "advisor_failed", message: msg });
  }
});

// --- Phase L11.3 — Makler-Lead absenden (PUBLIC, kein Auth) -----
const BrokerLeadCreateSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(200),
  phone: z.string().min(3).max(60),
  street: z.string().min(1).max(200),
  postalCode: z.string().min(1).max(20),
  city: z.string().min(1).max(120),
  assetType: z.enum(["ETW", "EFH", "MFH", "GEWERBE", "GRUNDSTUECK"]),
  locationQuality: z.enum(["TOP", "GUT", "MITTEL", "SCHWACH"]),
  area: z.number().min(1).max(100000),
  yearBuilt: z.number().int().min(1850).max(2030),
  condition: z.enum(["NEU", "GEPFLEGT", "SANIERUNGSBEDARF", "ABRISS"]),
  occupancy: z.enum(["LEERSTAND", "EIGEN", "VERMIETET"]),
  saleReason: z.enum(["FREIWILLIG", "ERBSCHAFT", "SCHEIDUNG", "FINANZIELL", "AUSWANDERUNG"]),
  timePressure: z.enum(["KEIN", "12M", "6M", "3M"]),
  experience: z.enum(["KEINE", "ETWAS", "VIEL"]),
  estimatedValue: z.number().int().min(0).max(100_000_000).optional(),
  scoreSelbst: z.number().int().min(0).max(100),
  scoreMakler: z.number().int().min(0).max(100),
  ownerNote: z.string().max(2000).optional(),
  aiReportSummary: z.string().max(4000).optional()
});

// Anti-Spam: max 3 Leads pro IP / 24h
const leadRateLimit = new Map<string, { count: number; windowStart: number }>();
const LEAD_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const LEAD_RATE_MAX = 3;

function leadRateOk(req: express.Request): boolean {
  const id = advisorClientId(req);
  const now = Date.now();
  const entry = leadRateLimit.get(id);
  if (!entry || now - entry.windowStart > LEAD_RATE_WINDOW_MS) {
    leadRateLimit.set(id, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= LEAD_RATE_MAX) return false;
  entry.count += 1;
  return true;
}

app.post("/sales-advisor/lead", async (req, res) => {
  if (!leadRateOk(req)) {
    return res.status(429).json({
      error: "rate_limit",
      message: "Zu viele Anfragen. Bitte später erneut versuchen."
    });
  }
  try {
    const body = BrokerLeadCreateSchema.parse(req.body);
    const lead = await prisma.brokerLead.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        street: body.street,
        postalCode: body.postalCode,
        city: body.city,
        assetType: body.assetType,
        locationQuality: body.locationQuality,
        area: body.area,
        yearBuilt: body.yearBuilt,
        condition: body.condition,
        occupancy: body.occupancy,
        saleReason: body.saleReason,
        timePressure: body.timePressure,
        experience: body.experience,
        estimatedValue: body.estimatedValue ?? null,
        scoreSelbst: body.scoreSelbst,
        scoreMakler: body.scoreMakler,
        ownerNote: body.ownerNote ?? null,
        aiReportSummary: body.aiReportSummary ?? null
      },
      select: { id: true, createdAt: true }
    });
    return res.json({ ok: true, leadId: lead.id, createdAt: lead.createdAt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
    return res.status(400).json({ error: "lead_failed", message: msg });
  }
});

// --- Auth-Schutz für alle datenrelevanten Routes -----------------
// /import/* und /health bleiben ohne requireAuth — /import/* braucht eigene
// Logik, die wir per Endpoint selbst behandeln (Bookmarklet-Endpoints
// können von beliebigen Origins kommen, müssen den User aber identifizieren).
app.use("/properties", requireAuth);
app.use("/analyze", requireAuth);
app.use("/offer", requireAuth);
app.use("/notes", requireAuth);
app.use("/analyses", requireAuth);
app.use("/me", requireAuth);
// Marketplace-Routes brauchen einen eingeloggten User, weil wir je nach
// Sichtbarkeit das Investor-Profil zeigen. /marketplace ist nicht öffentlich.
app.use("/marketplace", requireAuth);
// Mietbörse (Phase L6): auch eingeloggt-only, damit Bewerbungen einer
// User-ID zugeordnet werden können.
app.use("/rental-marketplace", requireAuth);
// Admin-Routen (Phase H8): zusätzlich isAdmin-Check pro Endpoint, aber
// requireAuth muss vorher laufen, damit req.userId gesetzt ist.
app.use("/admin", requireAuth);
// /import/* wird gleich pro-Endpoint gehandhabt (siehe weiter unten).

const DealStatusEnum = z.enum([
  "WATCHING",
  "INQUIRED",
  "NEGOTIATING",
  "LOI",
  "NOTAR",
  "CLOSED",
  "REJECTED"
]);

// Phase O+ — erweiterte Objektdaten. Lokale Enums, da BuildingConditionEnum/
// EnergyClassEnum erst weiter unten definiert sind (TDZ).
const PropertyConditionEnum = z.enum([
  "NEW",
  "REFURBISHED",
  "MODERNIZED",
  "MAINTAINED",
  "NEEDS_RENOVATION"
]);
const PropertyEnergyClassEnum = z.enum([
  "A_PLUS",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H"
]);

const PropertyCreateSchema = z.object({
  title: z.string().min(1),
  price: z.number().int().positive(),
  rent: z.number().int().nonnegative(),
  location: z.string().min(1),
  size: z.number().positive(),
  status: DealStatusEnum.optional(),
  yearBuilt: z.number().int().min(1800).max(2100).nullable().optional(),
  condition: PropertyConditionEnum.nullable().optional(),
  energyClass: PropertyEnergyClassEnum.nullable().optional(),
  units: z.number().int().min(0).max(100000).nullable().optional()
});

const PropertyUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  price: z.number().int().positive().optional(),
  rent: z.number().int().nonnegative().optional(),
  location: z.string().min(1).optional(),
  size: z.number().positive().optional(),
  status: DealStatusEnum.optional(),
  yearBuilt: z.number().int().min(1800).max(2100).nullable().optional(),
  condition: PropertyConditionEnum.nullable().optional(),
  energyClass: PropertyEnergyClassEnum.nullable().optional(),
  units: z.number().int().min(0).max(100000).nullable().optional()
});

const NoteCreateSchema = z.object({
  body: z.string().min(1).max(5000)
});

const AnalyzeSchema = z.object({
  scenarioName: z.string().min(1).max(80).optional(),
  equityRatio: z.number().min(0).max(1).optional(),
  loanInterestRate: z.number().min(0).max(0.30).optional(),
  loanRepaymentRate: z.number().min(0).max(0.30).optional(),
  taxRateIncome: z.number().min(0).max(1).optional(),
  closingCostsRate: z.number().min(0).max(0.30).optional(),
  maintenanceRate: z.number().min(0).max(1).optional(),
  vacancyRate: z.number().min(0).max(1).optional(),
  buildingShare: z.number().min(0).max(1).optional(),
  afaRate: z.number().min(0).max(0.10).optional()
});

const ImportExposeSchema = z.object({
  text: z.string().min(20).max(50000)
});

const ImportAuctionSchema = z.object({
  text: z.string().min(20).max(80000).optional(),
  pdfBase64: z.string().min(100).optional(),
  url: z.string().url().optional()
}).refine(
  (v) => !!v.text || !!v.pdfBase64 || !!v.url,
  { message: "Eines der Felder text, pdfBase64 oder url ist erforderlich." }
);

const ImportAuctionListSchema = z.object({
  url: z.string().url().optional(),
  text: z.string().min(50).max(120000).optional(),
  sourceUrl: z.string().url().optional() // optional: Original-URL für Detection des AuctionType
}).refine(
  (v) => !!v.url || !!v.text,
  { message: "Eines der Felder url oder text ist erforderlich." }
);

function detectAuctionTypeFromUrl(url: string): "ZVG" | "DGA" | "SDL" | "KARHAUSEN" | "OTHER" {
  const u = url.toLowerCase();
  if (u.includes("dga-ag.de") || u.includes("deutsche-grundstuecksauktionen") || u.includes("dga.")) return "DGA";
  if (u.includes("sdl-auktion") || u.includes("sdl.")) return "SDL";
  if (u.includes("karhausen")) return "KARHAUSEN";
  if (u.includes("zvg-portal") || u.includes("zvg.")) return "ZVG";
  return "OTHER";
}

async function fetchAndCleanHtml(url: string, maxChars = 60000): Promise<string> {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "DealFlow-AI/1.0 (Investor Research Tool)",
      Accept: "text/html,*/*"
    }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    // a-Tags vor dem Strip behalten — Hrefs sind wichtig für detailUrl
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, " [$2 -> $1] ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > maxChars) text = text.slice(0, maxChars);
  return text;
}

app.post("/properties", async (req, res) => {
  const parsed = PropertyCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const property = await prisma.property.create({
    data: { ...parsed.data, ownerId: req.userId! }
  });
  return res.status(201).json(property);
});

app.get("/properties", async (req, res) => {
  const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
  const statusParsed = statusParam ? DealStatusEnum.safeParse(statusParam) : null;
  if (statusParam && !statusParsed?.success) {
    return res.status(400).json({ error: "Invalid status filter" });
  }

  const properties = await prisma.property.findMany({
    where: {
      ownerId: req.userId!,
      ...(statusParsed?.success ? { status: statusParsed.data } : {})
    },
    orderBy: { updatedAt: "desc" },
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      offer: true,
      auction: true
    }
  });
  return res.json(properties);
});

app.get("/properties/:id", async (req, res) => {
  const { id } = req.params;
  const property = await prisma.property.findFirst({
    where: { id, ownerId: req.userId! },
    include: {
      analyses: { orderBy: { createdAt: "desc" } },
      offer: true,
      notes: { orderBy: { createdAt: "desc" } },
      marketComparison: true,
      auction: true
    }
  });
  if (!property) return res.status(404).json({ error: "Not found" });
  return res.json(property);
});

app.patch("/properties/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = PropertyUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const existing = await prisma.property.findFirst({ where: { id, ownerId: req.userId! } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const property = await prisma.property.update({
    where: { id },
    data: parsed.data
  });
  return res.json(property);
});

app.delete("/properties/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.property.findFirst({ where: { id, ownerId: req.userId! } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  await prisma.property.delete({ where: { id } });
  return res.status(204).end();
});

app.post("/properties/:id/notes", async (req, res) => {
  const { id } = req.params;
  const parsed = NoteCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const existing = await prisma.property.findFirst({ where: { id, ownerId: req.userId! } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const note = await prisma.note.create({
    data: {
      propertyId: id,
      body: parsed.data.body
    }
  });

  await prisma.property.update({ where: { id }, data: { updatedAt: new Date() } });

  return res.status(201).json(note);
});

app.delete("/notes/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const existing = await prisma.note.findUnique({
    where: { id: noteId },
    include: { property: { select: { ownerId: true } } }
  });
  if (!existing || existing.property.ownerId !== req.userId) {
    return res.status(404).json({ error: "Not found" });
  }
  await prisma.note.delete({ where: { id: noteId } });
  return res.status(204).end();
});

app.post("/analyze/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = AnalyzeSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const property = await prisma.property.findFirst({ where: { id, ownerId: req.userId! } });
  if (!property) return res.status(404).json({ error: "Not found" });

  const inputs = parsed.data;
  const assumptions: AnalysisAssumptions = {
    equityRatio: inputs.equityRatio ?? DEFAULT_ASSUMPTIONS.equityRatio,
    loanInterestRate: inputs.loanInterestRate ?? DEFAULT_ASSUMPTIONS.loanInterestRate,
    loanRepaymentRate: inputs.loanRepaymentRate ?? DEFAULT_ASSUMPTIONS.loanRepaymentRate,
    taxRateIncome: inputs.taxRateIncome ?? DEFAULT_ASSUMPTIONS.taxRateIncome,
    closingCostsRate: inputs.closingCostsRate ?? DEFAULT_ASSUMPTIONS.closingCostsRate,
    maintenanceRate: inputs.maintenanceRate ?? DEFAULT_ASSUMPTIONS.maintenanceRate,
    vacancyRate: inputs.vacancyRate ?? DEFAULT_ASSUMPTIONS.vacancyRate,
    buildingShare: inputs.buildingShare ?? DEFAULT_ASSUMPTIONS.buildingShare,
    afaRate: inputs.afaRate ?? DEFAULT_ASSUMPTIONS.afaRate
  };

  const result = computeFullAnalysis(property.price, property.rent, assumptions);

  const analysis = await prisma.analysis.create({
    data: {
      propertyId: id,
      scenarioName: inputs.scenarioName ?? "Standard",
      ...assumptions,
      ...result
    }
  });

  await prisma.property.update({ where: { id }, data: { updatedAt: new Date() } });

  return res.status(201).json(analysis);
});

app.delete("/analyses/:analysisId", async (req, res) => {
  const { analysisId } = req.params;
  const existing = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { property: { select: { ownerId: true } } }
  });
  if (!existing || existing.property.ownerId !== req.userId) {
    return res.status(404).json({ error: "Not found" });
  }
  await prisma.analysis.delete({ where: { id: analysisId } });
  return res.status(204).end();
});

app.post("/offer/:id", async (req, res) => {
  const { id } = req.params;
  const property = await prisma.property.findFirst({ where: { id, ownerId: req.userId! } });
  if (!property) return res.status(404).json({ error: "Not found" });

  const ai = await generateOfferWithClaude({
    price: property.price,
    rent: property.rent,
    location: property.location
  });

  const offer = await prisma.offer.upsert({
    where: { propertyId: id },
    create: {
      propertyId: id,
      suggestedPrice: ai.suggested_price,
      message: ai.message,
      model: ai.model
    },
    update: {
      suggestedPrice: ai.suggested_price,
      message: ai.message,
      model: ai.model
    }
  });

  return res.json({
    suggested_price: offer.suggestedPrice,
    message: offer.message
  });
});

// ============================================================
// Block C — KI-Magie
// ============================================================

app.post("/import/expose", bookmarkletCors, requireAuth, async (req, res) => {
  const parsed = ImportExposeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  try {
    const extracted = await extractPropertyFromText(parsed.data.text);
    return res.json({
      title: extracted.title,
      price: Math.round(extracted.price),
      rent: Math.round(extracted.rent),
      location: extracted.location,
      size: extracted.size,
      confidence: extracted.confidence ?? "medium",
      notes: extracted.notes ?? ""
    });
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : "Extraction failed"
    });
  }
});

app.post("/properties/:id/market-comparison", async (req, res) => {
  const { id } = req.params;
  const property = await prisma.property.findFirst({ where: { id, ownerId: req.userId! } });
  if (!property) return res.status(404).json({ error: "Not found" });

  const ai = await marketComparisonForProperty({
    price: property.price,
    rent: property.rent,
    location: property.location,
    size: property.size
  });

  const mc = await prisma.marketComparison.upsert({
    where: { propertyId: id },
    create: {
      propertyId: id,
      rentPerSqmLow: ai.comparable_rent_per_sqm_low,
      rentPerSqmHigh: ai.comparable_rent_per_sqm_high,
      pricePerSqmLow: ai.comparable_price_per_sqm_low,
      pricePerSqmHigh: ai.comparable_price_per_sqm_high,
      rating: ai.rating,
      rationale: ai.rationale,
      dataCaveat: ai.data_caveat,
      model: ai.model
    },
    update: {
      rentPerSqmLow: ai.comparable_rent_per_sqm_low,
      rentPerSqmHigh: ai.comparable_rent_per_sqm_high,
      pricePerSqmLow: ai.comparable_price_per_sqm_low,
      pricePerSqmHigh: ai.comparable_price_per_sqm_high,
      rating: ai.rating,
      rationale: ai.rationale,
      dataCaveat: ai.data_caveat,
      model: ai.model
    }
  });

  await prisma.property.update({ where: { id }, data: { updatedAt: new Date() } });

  return res.json(mc);
});

app.post("/import/auction", bookmarkletCors, requireAuth, async (req, res) => {
  const parsed = ImportAuctionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  // 1) Text gewinnen
  let text = parsed.data.text ?? "";

  if (!text && parsed.data.pdfBase64) {
    try {
      const pdf = await extractTextFromPdfBase64(parsed.data.pdfBase64);
      text = pdf.text;
    } catch (e) {
      return res.status(400).json({
        error: `PDF konnte nicht gelesen werden: ${e instanceof Error ? e.message : "unbekannter Fehler"}`
      });
    }
  }

  if (!text && parsed.data.url) {
    try {
      const r = await fetch(parsed.data.url, {
        headers: {
          "User-Agent": "DealFlow-AI/1.0 (Investor Research Tool)",
          Accept: "text/html,application/pdf,*/*"
        }
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const ct = r.headers.get("content-type") ?? "";
      if (ct.includes("pdf")) {
        const buf = Buffer.from(await r.arrayBuffer());
        const pdf = await extractTextFromPdfBase64(buf.toString("base64"));
        text = pdf.text;
      } else {
        const html = await r.text();
        // Sehr einfache HTML-Bereinigung — Claude verträgt etwas Struktur,
        // aber nicht 1 MB Boilerplate. Wir werfen nur Script/Style raus.
        text = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length > 30000) text = text.slice(0, 30000);
      }
    } catch (e) {
      return res.status(400).json({
        error: `URL konnte nicht geladen werden: ${e instanceof Error ? e.message : "unbekannter Fehler"}`
      });
    }
  }

  if (text.length < 20) {
    return res.status(400).json({ error: "Zu wenig Text für eine Extraktion." });
  }

  // 2) Claude-Extraktion
  const ai = await extractAuctionFromText(text);

  // 3) Bietlimit berechnen — falls Miete da ist
  const rent = ai.estimatedRent && ai.estimatedRent > 0 ? Math.round(ai.estimatedRent) : 0;
  const bidLimit = rent > 0 ? computeBidLimit(rent, DEFAULT_ASSUMPTIONS, 0) : null;
  const bidLimitNeutral = bidLimit;

  // 4) Property + AuctionInfo + Standard-Analyse anlegen
  const startPrice = ai.marketValue && ai.marketValue > 0
    ? Math.round(ai.marketValue * 0.7) // Gericht startet typisch bei 70 % Verkehrswert (kein Zuschlag unter 5/10 in 1. Termin)
    : (bidLimit ?? rent * 200); // Fallback

  const property = await prisma.property.create({
    data: {
      title: ai.title || `Versteigerung (${ai.auctionType ?? "ZVG"})`,
      price: startPrice,
      rent,
      location: ai.address || ai.auctionLocation || "Unbekannt",
      size: ai.size && ai.size > 0 ? ai.size : 50,
      dealType: "AUCTION",
      ownerId: req.userId!,
      auction: {
        create: {
          auctionType: (ai.auctionType ?? "ZVG") as "ZVG" | "DGA" | "SDL" | "KARHAUSEN" | "OTHER",
          caseNumber: ai.caseNumber,
          marketValue: ai.marketValue && ai.marketValue > 0 ? Math.round(ai.marketValue) : null,
          auctionDate: ai.auctionDateIso ? new Date(ai.auctionDateIso) : null,
          auctionLocation: ai.auctionLocation,
          sourceUrl: parsed.data.url ?? null,
          rawText: text.length > 8000 ? text.slice(0, 8000) : text,
          bidLimit,
          bidLimitNeutral,
          notes: ai.notes
        }
      }
    },
    include: { auction: true }
  });

  // Wenn Miete vorhanden: Standard-Analyse direkt mitberechnen
  if (rent > 0) {
    const result = computeFullAnalysis(property.price, rent, DEFAULT_ASSUMPTIONS);
    await prisma.analysis.create({
      data: {
        propertyId: property.id,
        scenarioName: "Standard (Versteigerung Importzeit)",
        ...DEFAULT_ASSUMPTIONS,
        ...result
      }
    });
  }

  return res.status(201).json(property);
});

app.post("/import/auction-list", bookmarkletCors, requireAuth, async (req, res) => {
  const parsed = ImportAuctionListSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { url, text, sourceUrl } = parsed.data;
  let pageText: string;

  if (text) {
    // Bookmarklet-Variante: fertig gerenderter DOM-Text vom Client
    pageText = text;
  } else if (url) {
    try {
      pageText = await fetchAndCleanHtml(url, 60000);
    } catch (e) {
      return res.status(400).json({
        error: `URL konnte nicht geladen werden: ${e instanceof Error ? e.message : "unbekannter Fehler"}`
      });
    }
  } else {
    return res.status(400).json({ error: "Weder url noch text geliefert." });
  }

  if (pageText.length < 50) {
    return res.status(400).json({ error: "Zu wenig Text für eine Listen-Extraktion." });
  }

  const detectionUrl = url ?? sourceUrl ?? "";
  const auctionType = detectAuctionTypeFromUrl(detectionUrl);
  const { items } = await extractAuctionListFromText(pageText);

  if (items.length === 0) {
    return res.status(200).json({
      imported: 0,
      skipped: 0,
      detectedType: auctionType,
      message: "Claude hat keine Auktions-Einträge in dieser Seite gefunden. Eventuell ist es eine Detail-Seite — dann nutze stattdessen den Single-Import."
    });
  }

  // Absolute Detail-URLs herstellen (wenn relative). Basis-URL = Source-URL oder explizit übergebene sourceUrl
  const baseRef = url ?? sourceUrl;
  const baseUrl = (() => {
    if (!baseRef) return null;
    try {
      const u = new URL(baseRef);
      return `${u.protocol}//${u.host}`;
    } catch {
      return null;
    }
  })();

  const importedIds: string[] = [];
  let skipped = 0;

  for (const item of items) {
    if (!item.title) {
      skipped++;
      continue;
    }

    let detailUrl = item.detailUrl ?? null;
    if (detailUrl && !detailUrl.startsWith("http") && baseUrl) {
      detailUrl = baseUrl + (detailUrl.startsWith("/") ? "" : "/") + detailUrl;
    }

    const rent = item.estimatedRent && item.estimatedRent > 0 ? Math.round(item.estimatedRent) : 0;
    const bidLimit = rent > 0 ? computeBidLimit(rent, DEFAULT_ASSUMPTIONS, 0) : null;
    const startPrice = item.marketValue && item.marketValue > 0
      ? Math.round(item.marketValue * 0.7)
      : (bidLimit ?? Math.max(50_000, rent * 200));

    try {
      const property = await prisma.property.create({
        data: {
          title: item.title,
          price: startPrice,
          rent,
          location: item.address || item.auctionLocation || "Unbekannt",
          size: item.size && item.size > 0 ? item.size : 50,
          dealType: "AUCTION",
          ownerId: req.userId!,
          auction: {
            create: {
              auctionType,
              caseNumber: item.caseNumber,
              marketValue: item.marketValue && item.marketValue > 0 ? Math.round(item.marketValue) : null,
              auctionDate: item.auctionDateIso ? new Date(item.auctionDateIso) : null,
              auctionLocation: item.auctionLocation,
              sourceUrl: detailUrl ?? baseRef ?? null,
              rawText: null,
              bidLimit,
              bidLimitNeutral: bidLimit,
              notes: item.notes
            }
          }
        }
      });
      importedIds.push(property.id);

      if (rent > 0) {
        const result = computeFullAnalysis(property.price, rent, DEFAULT_ASSUMPTIONS);
        await prisma.analysis.create({
          data: {
            propertyId: property.id,
            scenarioName: "Standard (Listen-Import)",
            ...DEFAULT_ASSUMPTIONS,
            ...result
          }
        });
      }
    } catch (e) {
      console.error(`Konnte Listen-Eintrag nicht anlegen: ${item.title}`, e);
      skipped++;
    }
  }

  return res.status(201).json({
    imported: importedIds.length,
    skipped,
    detectedType: auctionType,
    propertyIds: importedIds
  });
});

app.post("/properties/:id/recompute-bid-limit", async (req, res) => {
  const { id } = req.params;
  const parsed = AnalyzeSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const property = await prisma.property.findFirst({
    where: { id, ownerId: req.userId! },
    include: { auction: true }
  });
  if (!property) return res.status(404).json({ error: "Not found" });
  if (!property.auction) return res.status(400).json({ error: "Property hat keine AuctionInfo" });
  if (property.rent <= 0) return res.status(400).json({ error: "Keine Miete hinterlegt — Bietlimit nicht berechenbar" });

  const inputs = parsed.data;
  const assumptions: AnalysisAssumptions = {
    equityRatio: inputs.equityRatio ?? DEFAULT_ASSUMPTIONS.equityRatio,
    loanInterestRate: inputs.loanInterestRate ?? DEFAULT_ASSUMPTIONS.loanInterestRate,
    loanRepaymentRate: inputs.loanRepaymentRate ?? DEFAULT_ASSUMPTIONS.loanRepaymentRate,
    taxRateIncome: inputs.taxRateIncome ?? DEFAULT_ASSUMPTIONS.taxRateIncome,
    closingCostsRate: inputs.closingCostsRate ?? DEFAULT_ASSUMPTIONS.closingCostsRate,
    maintenanceRate: inputs.maintenanceRate ?? DEFAULT_ASSUMPTIONS.maintenanceRate,
    vacancyRate: inputs.vacancyRate ?? DEFAULT_ASSUMPTIONS.vacancyRate,
    buildingShare: inputs.buildingShare ?? DEFAULT_ASSUMPTIONS.buildingShare,
    afaRate: inputs.afaRate ?? DEFAULT_ASSUMPTIONS.afaRate
  };

  const bidLimit = computeBidLimit(property.rent, assumptions, 0);
  const bidLimitNeutral = bidLimit;

  const updated = await prisma.auctionInfo.update({
    where: { propertyId: id },
    data: { bidLimit, bidLimitNeutral }
  });

  return res.json(updated);
});

// --- Phase N — Oikos Capital Layer, Schritt 1 ----------------------
// GET /properties/:id/financing-readiness
// Live berechnete Bankfaehigkeits-Ampel aus Property + Investor-Profil
// + letzter Analyse. Keine DB-Tabelle, keine Vermittlung — reine
// Selbsteinschaetzung (siehe Disclaimer in lib/financing.ts).
app.get("/properties/:id/financing-readiness", async (req, res) => {
  const { id } = req.params;

  const property = await prisma.property.findFirst({
    where: { id, ownerId: req.userId! },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  if (!property) return res.status(404).json({ error: "Not found" });
  if (property.rent <= 0) {
    return res.status(400).json({
      error: "Keine Miete hinterlegt — Bankfaehigkeit nicht bewertbar"
    });
  }

  const profile = await prisma.investorProfile.findUnique({
    where: { userId: req.userId! }
  });

  const latest = property.analyses[0] ?? null;

  const result = computeFinancingReadiness(
    property.price,
    property.rent,
    profile
      ? {
          equity: profile.equity,
          monthlyIncome: profile.monthlyIncome,
          monthlyDebt: profile.monthlyDebt,
          financingPreApproved: profile.financingPreApproved
        }
      : null,
    latest
      ? {
          scenarioName: latest.scenarioName,
          closingCosts: latest.closingCosts,
          totalInvestment: latest.totalInvestment,
          loan: latest.loan,
          monthlyInterest: latest.monthlyInterest,
          monthlyRepayment: latest.monthlyRepayment,
          monthlyMaintenance: latest.monthlyMaintenance,
          monthlyVacancyLoss: latest.monthlyVacancyLoss,
          score: latest.score
        }
      : undefined
  );

  return res.json(result);
});

// GET /me/financing/overview — Capital-Layer-Cockpit.
app.get("/me/financing/overview", async (req, res) => {
  const userId = req.userId!;

  const profile = await prisma.investorProfile.findUnique({ where: { userId } });
  const profileInput = profile
    ? {
        equity: profile.equity,
        monthlyIncome: profile.monthlyIncome,
        monthlyDebt: profile.monthlyDebt,
        financingPreApproved: profile.financingPreApproved
      }
    : null;

  const properties = await prisma.property.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  const items = properties.map((p) => {
    const base = {
      id: p.id,
      title: p.title,
      location: p.location,
      price: p.price,
      rent: p.rent,
      status: p.status
    };
    if (p.rent <= 0) {
      return {
        ...base,
        evaluated: false,
        overall: null,
        overallLabel: null,
        readinessScore: null
      };
    }
    const latest = p.analyses[0] ?? null;
    const r = computeFinancingReadiness(
      p.price,
      p.rent,
      profileInput,
      latest
        ? {
            scenarioName: latest.scenarioName,
            closingCosts: latest.closingCosts,
            totalInvestment: latest.totalInvestment,
            loan: latest.loan,
            monthlyInterest: latest.monthlyInterest,
            monthlyRepayment: latest.monthlyRepayment,
            monthlyMaintenance: latest.monthlyMaintenance,
            monthlyVacancyLoss: latest.monthlyVacancyLoss,
            score: latest.score
          }
        : undefined
    );
    return {
      ...base,
      evaluated: true,
      overall: r.overall,
      overallLabel: r.overallLabel,
      readinessScore: r.readinessScore
    };
  });

  const evaluated = items.filter((i) => i.evaluated);
  const counts = {
    green: evaluated.filter((i) => i.overall === "GREEN").length,
    yellow: evaluated.filter((i) => i.overall === "YELLOW").length,
    red: evaluated.filter((i) => i.overall === "RED").length
  };

  return res.json({
    hasProfile: profile != null,
    total: items.length,
    counts,
    items
  });
});

// --- Phase O — Oikos Capital Layer: Finanzierungsanfragen ----------
// Persistenter Finanzierungsvorgang pro Objekt. Reine Organisation/
// Aufbereitung, keine Vermittlung. Multi-Tenant via ownerId.
const FinancingRequestStatusEnum = z.enum([
  "OFFEN",
  "IN_VORBEREITUNG",
  "BEREIT",
  "AN_PARTNER",
  "ZUGESAGT",
  "ABGELEHNT"
]);

// POST /properties/:id/financing-requests — Anfrage aus einem Objekt anlegen.
app.post("/properties/:id/financing-requests", async (req, res) => {
  const { id } = req.params;
  const body = z
    .object({
      desiredLoanAmount: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
      note: z.string().max(2000).nullable().optional()
    })
    .safeParse(req.body || {});
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload", details: body.error.flatten() });
  }

  const property = await prisma.property.findFirst({
    where: { id, ownerId: req.userId! },
    include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  if (!property) return res.status(404).json({ error: "Not found" });

  // Snapshot der aktuellen Bankfähigkeit (nur wenn Miete vorhanden).
  let overall: string | null = null;
  let readinessScore: number | null = null;
  if (property.rent > 0) {
    const profile = await prisma.investorProfile.findUnique({ where: { userId: req.userId! } });
    const latest = property.analyses[0] ?? null;
    const r = computeFinancingReadiness(
      property.price,
      property.rent,
      profile
        ? {
            equity: profile.equity,
            monthlyIncome: profile.monthlyIncome,
            monthlyDebt: profile.monthlyDebt,
            financingPreApproved: profile.financingPreApproved
          }
        : null,
      latest
        ? {
            scenarioName: latest.scenarioName,
            closingCosts: latest.closingCosts,
            totalInvestment: latest.totalInvestment,
            loan: latest.loan,
            monthlyInterest: latest.monthlyInterest,
            monthlyRepayment: latest.monthlyRepayment,
            monthlyMaintenance: latest.monthlyMaintenance,
            monthlyVacancyLoss: latest.monthlyVacancyLoss,
            score: latest.score
          }
        : undefined
    );
    overall = r.overall;
    readinessScore = r.readinessScore;
  }

  const created = await prisma.financingRequest.create({
    data: {
      propertyId: id,
      ownerId: req.userId!,
      overall,
      readinessScore,
      desiredLoanAmount: body.data.desiredLoanAmount ?? null,
      note: body.data.note ?? null
    }
  });

  return res.status(201).json(created);
});

// GET /me/financing-requests — alle eigenen Anfragen (für das Cockpit).
app.get("/me/financing-requests", async (req, res) => {
  const requests = await prisma.financingRequest.findMany({
    where: { ownerId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      property: { select: { id: true, title: true, location: true, price: true, rent: true } }
    }
  });
  return res.json(requests);
});

// PATCH /me/financing-requests/:id — Status / Notiz / Volumen aktualisieren.
app.patch("/me/financing-requests/:id", async (req, res) => {
  const { id } = req.params;
  const body = z
    .object({
      status: FinancingRequestStatusEnum.optional(),
      note: z.string().max(2000).nullable().optional(),
      desiredLoanAmount: z.number().int().min(0).max(1_000_000_000).nullable().optional()
    })
    .safeParse(req.body || {});
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload", details: body.error.flatten() });
  }

  const existing = await prisma.financingRequest.findFirst({
    where: { id, ownerId: req.userId! }
  });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.financingRequest.update({
    where: { id },
    data: body.data
  });
  return res.json(updated);
});

// DELETE /me/financing-requests/:id
app.delete("/me/financing-requests/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.financingRequest.findFirst({
    where: { id, ownerId: req.userId! }
  });
  if (!existing) return res.status(404).json({ error: "Not found" });
  await prisma.financingRequest.delete({ where: { id } });
  return res.status(204).end();
});

// =====================================================================
// Phase P — Partnerökosystem: Finanzierungspartner (Verzeichnis + neutrales
// Matching). Oikos = Tippgeber: kriterienbasierte Vorauswahl, KEINE
// Empfehlung/Vermittlung. Admin pflegt das Verzeichnis.
// =====================================================================
const FinancingPartnerTypeEnum = z.enum([
  "BANK",
  "SPARKASSE",
  "VOLKSBANK",
  "VERMITTLER",
  "SPEZIALFINANZIERER",
  "DEBT_FONDS"
]);
const PartnerAssetTypeEnum = z.enum([
  "MFH",
  "COMMERCIAL",
  "MIXED_USE",
  "SINGLE_FAMILY",
  "APARTMENT",
  "LAND",
  "OTHER"
]);
const FinancingPartnerBodySchema = z.object({
  name: z.string().min(1).max(200),
  type: FinancingPartnerTypeEnum,
  active: z.boolean().optional(),
  assetTypes: z.array(PartnerAssetTypeEnum).optional(),
  regions: z.array(z.string().min(1).max(80)).max(60).optional(),
  minVolume: z.number().int().min(0).nullable().optional(),
  maxVolume: z.number().int().min(0).nullable().optional(),
  maxLtv: z.number().min(0).max(2).nullable().optional(),
  investorTypes: z.array(z.string().min(1).max(40)).max(20).optional(),
  contactEmail: z.string().max(200).nullable().optional(),
  contactPhone: z.string().max(80).nullable().optional(),
  website: z.string().max(300).nullable().optional(),
  note: z.string().max(2000).nullable().optional()
});
const FinancingPartnerUpdateSchema = FinancingPartnerBodySchema.partial();

app.post("/admin/financing-partners", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  const body = FinancingPartnerBodySchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload", details: body.error.flatten() });
  }
  const created = await prisma.financingPartner.create({ data: body.data });
  return res.status(201).json(created);
});

app.get("/admin/financing-partners", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  const list = await prisma.financingPartner.findMany({
    orderBy: [{ active: "desc" }, { type: "asc" }, { name: "asc" }]
  });
  return res.json(list);
});

app.patch("/admin/financing-partners/:id", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  const body = FinancingPartnerUpdateSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid payload", details: body.error.flatten() });
  }
  const existing = await prisma.financingPartner.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.financingPartner.update({
    where: { id: req.params.id },
    data: body.data
  });
  return res.json(updated);
});

app.delete("/admin/financing-partners/:id", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  const existing = await prisma.financingPartner.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  await prisma.financingPartner.delete({ where: { id: req.params.id } });
  return res.status(204).end();
});

app.post("/admin/financing-partners/seed-demo", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  const demo = [
    { name: "Sparkasse Musterstadt", type: "SPARKASSE" as const, regions: ["Berlin", "Brandenburg"], minVolume: 50000, maxVolume: 2000000, maxLtv: 0.85, note: "Regionaler Bestandsfinanzierer" },
    { name: "Volksbank Rhein-Ruhr", type: "VOLKSBANK" as const, regions: ["NRW", "Essen", "Düsseldorf", "Bochum"], minVolume: 50000, maxVolume: 1500000, maxLtv: 0.85, note: "Genossenschaftlich, Mittelstand" },
    { name: "Bundesweite Geschäftsbank AG", type: "BANK" as const, regions: [], minVolume: 100000, maxVolume: 10000000, maxLtv: 0.8, note: "Standardfinanzierungen, größere Volumina" },
    { name: "Capital Finanzvermittlung", type: "VERMITTLER" as const, regions: [], minVolume: 30000, maxVolume: 5000000, maxLtv: 0.9, note: "Marktüberblick + Antragsstrecke (§ 34i/§ 34c)" },
    { name: "GewerbeInvest Spezial", type: "SPEZIALFINANZIERER" as const, regions: [], minVolume: 500000, maxVolume: 20000000, maxLtv: 0.8, note: "Gewerbe/Projektentwicklung, komplexe Fälle" },
    { name: "Bridge Capital Debt Fund", type: "DEBT_FONDS" as const, regions: [], minVolume: 1000000, maxVolume: 50000000, maxLtv: 0.92, note: "Mezzanine/Bridge, hohe LTVs, Tempo" }
  ];
  await prisma.financingPartner.createMany({ data: demo });
  const list = await prisma.financingPartner.findMany({ orderBy: { name: "asc" } });
  return res.json(list);
});

// GET /properties/:id/financing-partners — neutrales, kriterienbasiertes Matching
app.get("/properties/:id/financing-partners", async (req, res) => {
  const property = await prisma.property.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!property) return res.status(404).json({ error: "Not found" });

  const profile = await prisma.investorProfile.findUnique({ where: { userId: req.userId! } });
  const ti = property.price * 1.1;
  let er = 0.2;
  if (profile?.equity != null && ti > 0) {
    er = Math.max(0.05, Math.min(0.95, profile.equity / ti));
  }
  const loan = Math.round(ti * (1 - er));
  const ltv = property.price > 0 ? loan / property.price : 0;
  const loc = property.location.toLowerCase();

  const partners = await prisma.financingPartner.findMany({ where: { active: true } });
  const matched = partners
    .filter((pp) => pp.minVolume == null || loan >= pp.minVolume)
    .filter((pp) => pp.maxVolume == null || loan <= pp.maxVolume)
    .filter((pp) => pp.maxLtv == null || ltv <= pp.maxLtv)
    .filter((pp) => pp.regions.length === 0 || pp.regions.some((r) => loc.includes(r.toLowerCase())))
    .map((pp) => ({
      id: pp.id,
      name: pp.name,
      type: pp.type,
      regions: pp.regions,
      minVolume: pp.minVolume,
      maxVolume: pp.maxVolume,
      maxLtv: pp.maxLtv,
      website: pp.website,
      contactEmail: pp.contactEmail,
      contactPhone: pp.contactPhone,
      note: pp.note
    }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  return res.json({
    basis: { loan, ltv },
    total: partners.length,
    matchedCount: matched.length,
    partners: matched,
    disclaimer:
      "Neutrale, kriterienbasierte Vorauswahl — keine Empfehlung und keine Vermittlung durch Oikos. Beratung und Vermittlung erfolgen durch den Partner (§ 34i/§ 34c GewO)."
  });
});

// /me — eingeloggter User selbst
app.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "User not found" });

  // Phase H3 — DAILY_LOGIN-Hook. Idempotent ueber UTC-Tagesschluessel,
  // also ein Coin/Tag, egal wie oft GET /me aufgerufen wird. Fehler werden
  // verschluckt, damit /me nicht wegen Coin-Buchung 500t.
  let coinsBalance = user.coinsBalance;
  try {
    const result = await earn(user.id, "DAILY_LOGIN", todayUtcKey());
    if (result.ok) coinsBalance = result.newBalance;
  } catch {
    // bewusst leise — DAILY_LOGIN ist nice-to-have
  }

  const legacyCount = await prisma.property.count({ where: { ownerId: null } });
  return res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    onboardingCompletedAt: user.onboardingCompletedAt,
    legacyCount,
    plan: user.plan,
    planValidUntil: user.planValidUntil,
    // --- Coin-System (Phase H3 + H8) ---
    coinsBalance,
    isEarlyBird: user.isEarlyBird,
    isAdmin: user.isAdmin
  });
});

const UserRoleEnum = z.enum(["INVESTOR", "SELLER", "BOTH", "BROKER", "LANDLORD", "TENANT"]);

// PATCH /me — Felder updaten (z. B. Name, Rolle)
app.patch("/me", async (req, res) => {
  const body = z
    .object({
      name: z.string().min(1).max(120).optional(),
      role: UserRoleEnum.optional()
    })
    .parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: body
  });
  return res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    onboardingCompletedAt: user.onboardingCompletedAt
  });
});

// POST /me/complete-onboarding — schließt das Onboarding ab. Optional
// werden gleich Rolle und Name gesetzt. Phase H3: optional referredById
// fuer den Referral-Flow (Frontend liest ?ref=... aus dem Onboarding-Link
// und reicht es weiter).
app.post("/me/complete-onboarding", async (req, res) => {
  const body = z
    .object({
      role: UserRoleEnum.optional(),
      name: z.string().min(1).max(120).optional(),
      referredById: z.string().min(1).max(40).nullable().optional()
    })
    .parse(req.body ?? {});

  // Self-Referral verhindern (manipulierter ?ref-Link).
  const safeReferredById =
    body.referredById && body.referredById !== req.userId!
      ? body.referredById
      : null;

  // Existenz des Werbers pruefen — bei ungueltigem Wert einfach ignorieren,
  // statt den Onboarding-Flow zu killen.
  let referredByValid: string | null = null;
  if (safeReferredById) {
    const ref = await prisma.user.findUnique({
      where: { id: safeReferredById },
      select: { id: true }
    });
    referredByValid = ref?.id ?? null;
  }

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      // referredById nur setzen, wenn noch nicht gesetzt (kein "umwerben"
      // bestehender User durch erneutes Onboarding).
      ...(referredByValid ? { referredById: referredByValid } : {}),
      onboardingCompletedAt: new Date()
    }
  });

  // Phase H3 — Early-Bird-Flag fuer die ersten 100 BROKER-User.
  if (user.role === "BROKER") {
    try {
      await maybeMarkEarlyBird(user.id, user.role);
    } catch {
      /* leise */
    }
  }

  return res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    onboardingCompletedAt: user.onboardingCompletedAt
  });
});

// Übernimmt alle bestandenen Properties ohne Owner. Einmalig nach dem
// ersten Login auszuführen, damit Marco seine alten Daten wieder sieht.
app.post("/me/claim-legacy", async (req, res) => {
  const result = await prisma.property.updateMany({
    where: { ownerId: null },
    data: { ownerId: req.userId! }
  });
  return res.json({ claimed: result.count });
});

// --- Investor-Profil + Trackrecord (Push B) ---------------------

const AssetTypeEnum = z.enum([
  "MFH",
  "COMMERCIAL",
  "MIXED_USE",
  "SINGLE_FAMILY",
  "APARTMENT",
  "LAND",
  "OTHER"
]);

const ProfileVisibilityEnum = z.enum(["PRIVATE", "ON_REQUEST", "PUBLIC"]);

const TrackrecordRoleEnum = z.enum([
  "BUYER",
  "SELLER",
  "PARTNER",
  "BROKER",
  "OTHER"
]);

/**
 * Berechnet einen groben Bonitäts-Indikator:
 *  - maxMonthlyDebtService: 40 % des Netto-Einkommens minus laufende Verbindlichkeiten
 *  - maxLoan:               daraus per Annuität (Zins + Tilgung 5,8 %) das maximale Darlehen
 *  - maxInvestment:         maxLoan + Eigenkapital
 * Werte sind nur null, wenn die Inputs fehlen — Frontend zeigt sie dann nicht an.
 */
function computeAffordability(p: {
  equity?: number | null;
  monthlyIncome?: number | null;
  monthlyDebt?: number | null;
}): {
  maxMonthlyDebtService: number | null;
  maxLoan: number | null;
  maxInvestment: number | null;
} {
  if (p.monthlyIncome == null) {
    return { maxMonthlyDebtService: null, maxLoan: null, maxInvestment: null };
  }
  const debtCap = p.monthlyIncome * 0.4;
  const debt = p.monthlyDebt ?? 0;
  const maxMonthlyDebtService = Math.max(0, Math.round(debtCap - debt));
  // Annuitäts-Faktor (Zins 3,8 % + Tilgung 2,0 % = 5,8 % p. a.) ≈ 0,058 / 12 ≈ 0,00483 monatlich
  // maxLoan ≈ maxMonthlyDebtService / 0,00483
  const annuityFactorMonthly = 0.058 / 12;
  const maxLoan = annuityFactorMonthly > 0
    ? Math.round(maxMonthlyDebtService / annuityFactorMonthly)
    : null;
  const maxInvestment = maxLoan != null ? maxLoan + (p.equity ?? 0) : null;
  return { maxMonthlyDebtService, maxLoan, maxInvestment };
}

function serializeProfile(p: {
  bio: string | null;
  investmentExperienceYears: number;
  equity: number | null;
  monthlyIncome: number | null;
  monthlyDebt: number | null;
  financingPreApproved: boolean;
  financingNote: string | null;
  preferredAssetTypes: string[];
  preferredRegions: string[];
  minTicketSize: number | null;
  maxTicketSize: number | null;
  visibility: string;
}) {
  return {
    bio: p.bio,
    investmentExperienceYears: p.investmentExperienceYears,
    equity: p.equity,
    monthlyIncome: p.monthlyIncome,
    monthlyDebt: p.monthlyDebt,
    financingPreApproved: p.financingPreApproved,
    financingNote: p.financingNote,
    preferredAssetTypes: p.preferredAssetTypes,
    preferredRegions: p.preferredRegions,
    minTicketSize: p.minTicketSize,
    maxTicketSize: p.maxTicketSize,
    visibility: p.visibility,
    affordability: computeAffordability({
      equity: p.equity,
      monthlyIncome: p.monthlyIncome,
      monthlyDebt: p.monthlyDebt
    })
  };
}

// GET /me/profile — eigenes Profil (legt es bei Bedarf leer an)
app.get("/me/profile", async (req, res) => {
  const userId = req.userId!;
  let profile = await prisma.investorProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.investorProfile.create({ data: { userId } });
  }
  const trackrecord = await prisma.trackrecordItem.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }]
  });
  return res.json({
    ...serializeProfile(profile),
    trackrecord
  });
});

// PATCH /me/profile — Felder updaten (alle optional)
app.patch("/me/profile", async (req, res) => {
  const body = z
    .object({
      bio: z.string().max(2000).nullable().optional(),
      investmentExperienceYears: z.number().int().min(0).max(80).optional(),
      equity: z.number().int().min(0).nullable().optional(),
      monthlyIncome: z.number().int().min(0).nullable().optional(),
      monthlyDebt: z.number().int().min(0).nullable().optional(),
      financingPreApproved: z.boolean().optional(),
      financingNote: z.string().max(500).nullable().optional(),
      preferredAssetTypes: z.array(AssetTypeEnum).optional(),
      preferredRegions: z.array(z.string().min(1).max(80)).max(40).optional(),
      minTicketSize: z.number().int().min(0).nullable().optional(),
      maxTicketSize: z.number().int().min(0).nullable().optional(),
      visibility: ProfileVisibilityEnum.optional()
    })
    .parse(req.body);

  const userId = req.userId!;
  // upsert, falls Profil noch nicht existiert
  const profile = await prisma.investorProfile.upsert({
    where: { userId },
    update: body,
    create: { userId, ...body }
  });

  // Phase H3 — PROFILE_COMPLETED-Hook. Idempotent ueber refId="self",
  // also wird der Coin nur einmal vergeben. Wenn das Profil ein zweites
  // Mal alle Pflichtfelder erreicht (nach zwischenzeitlicher Loeschung),
  // gibts keinen weiteren Earn — das ist gewollt (Anti-Farming).
  try {
    if (await isInvestorProfileCompleted(userId)) {
      await earn(userId, "PROFILE_COMPLETED", "self");
      // Referral-Trigger: vielleicht erfuellt der User jetzt beide
      // Bedingungen (Profile + Listing).
      await tryTriggerReferral(userId);
    }
  } catch {
    // Coin-Buchung soll PATCH /me/profile nicht killen
  }

  const trackrecord = await prisma.trackrecordItem.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }]
  });
  return res.json({
    ...serializeProfile(profile),
    trackrecord
  });
});

// POST /me/trackrecord — neuen Trackrecord-Eintrag anlegen
app.post("/me/trackrecord", async (req, res) => {
  const body = z
    .object({
      type: AssetTypeEnum,
      year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
      value: z.number().int().min(0).nullable().optional(),
      location: z.string().min(1).max(120),
      role: TrackrecordRoleEnum,
      description: z.string().max(1000).nullable().optional(),
      verifiedBy: z.string().max(200).nullable().optional()
    })
    .parse(req.body);

  const item = await prisma.trackrecordItem.create({
    data: { ...body, userId: req.userId! }
  });
  return res.json(item);
});

// DELETE /me/trackrecord/:id — eigenen Eintrag löschen
app.delete("/me/trackrecord/:id", async (req, res) => {
  const item = await prisma.trackrecordItem.findFirst({
    where: { id: req.params.id, userId: req.userId! }
  });
  if (!item) return res.status(404).json({ error: "Not found" });
  await prisma.trackrecordItem.delete({ where: { id: item.id } });
  return res.json({ ok: true });
});

// --- Mieter-Profil (Phase L8) -----------------------------------

// GET /me/tenant-profile — eigenes Mieter-Profil (legt es bei Bedarf leer an)
app.get("/me/tenant-profile", async (req, res) => {
  const userId = req.userId!;
  let profile = await prisma.tenantProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.tenantProfile.create({ data: { userId } });
  }
  return res.json(profile);
});

// PATCH /me/tenant-profile — Felder updaten (alle optional)
const TenantProfilePatchSchema = z.object({
  aboutText: z.string().max(2000).nullable().optional(),

  employmentType: z.string().max(120).nullable().optional(),
  employmentDuration: z.string().max(120).nullable().optional(),
  employer: z.string().max(200).nullable().optional(),
  monthlyNetIncome: z.number().int().min(0).max(1000000).nullable().optional(),
  additionalIncome: z.number().int().min(0).max(1000000).nullable().optional(),
  schufaScore: z.string().max(80).nullable().optional(),
  hasSchufaCert: z.boolean().optional(),

  householdSize: z.number().int().min(1).max(20).nullable().optional(),
  hasPets: z.boolean().optional(),
  petDetails: z.string().max(300).nullable().optional(),
  smoker: z.boolean().optional(),

  desiredCity: z.string().max(120).nullable().optional(),
  desiredAreaMin: z.number().min(0).max(2000).nullable().optional(),
  desiredRoomsMin: z.number().min(0).max(20).nullable().optional(),
  desiredRentMax: z.number().int().min(0).max(100000).nullable().optional(),
  desiredMoveInDate: z.string().nullable().optional(),
  intendedDuration: z.string().max(200).nullable().optional(),
  openForFurnished: z.boolean().optional(),
  needsBarrierFree: z.boolean().optional(),
  needsParking: z.boolean().optional(),

  visibility: ProfileVisibilityEnum.optional()
});

app.patch("/me/tenant-profile", async (req, res) => {
  const body = TenantProfilePatchSchema.parse(req.body);
  const userId = req.userId!;

  const { desiredMoveInDate, ...rest } = body;
  const data: Record<string, unknown> = { ...rest };
  if (desiredMoveInDate !== undefined) {
    data.desiredMoveInDate = desiredMoveInDate ? new Date(desiredMoveInDate) : null;
  }

  const profile = await prisma.tenantProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data }
  });
  return res.json(profile);
});

// --- Verkäufer-Listings (Push C) --------------------------------

const ListingStatusEnum = z.enum([
  "DRAFT",
  "ACTIVE",
  "IN_NEGOTIATION",
  "SOLD",
  "ARCHIVED"
]);

const AnonymizationLevelEnum = z.enum([
  "FULL_ADDRESS",
  "DISTRICT_ONLY",
  "CITY_ONLY"
]);

// Listing-v2 Enums (für Zod)
const BuildingConditionEnum = z.enum([
  "NEW",
  "REFURBISHED",
  "MODERNIZED",
  "MAINTAINED",
  "NEEDS_RENOVATION"
]);
const EnergyClassEnum = z.enum([
  "A_PLUS",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H"
]);
const EnergyCarrierEnum = z.enum([
  "GAS",
  "OIL",
  "ELECTRIC",
  "DISTRICT_HEATING",
  "HEAT_PUMP",
  "PELLETS",
  "WOOD",
  "SOLAR",
  "OTHER"
]);

const ListingCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(20000).optional().default(""),
  propertyType: AssetTypeEnum,
  askingPrice: z.number().int().min(0),
  totalArea: z.number().min(0),
  totalRent: z.number().int().min(0).nullable().optional(),
  city: z.string().min(1).max(100),
  postalCode: z.string().max(10).nullable().optional(),
  district: z.string().max(120).nullable().optional(),
  fullAddress: z.string().max(200).nullable().optional(),
  anonymizationLevel: AnonymizationLevelEnum.optional(),

  // --- Listing v2: alle optional, alles kann später per PATCH gepflegt werden ---
  yearBuilt: z.number().int().min(1500).max(2100).nullable().optional(),
  lastRenovation: z.number().int().min(1500).max(2100).nullable().optional(),
  condition: BuildingConditionEnum.nullable().optional(),
  livingArea: z.number().min(0).nullable().optional(),
  commercialArea: z.number().min(0).nullable().optional(),
  landArea: z.number().min(0).nullable().optional(),
  floors: z.number().int().min(0).max(200).nullable().optional(),

  residentialUnits: z.number().int().min(0).max(10000).nullable().optional(),
  commercialUnits: z.number().int().min(0).max(10000).nullable().optional(),

  energyClass: EnergyClassEnum.nullable().optional(),
  energyConsumption: z.number().min(0).nullable().optional(),
  energyCarrier: EnergyCarrierEnum.nullable().optional(),
  heatingType: z.string().max(120).nullable().optional(),

  actualRent: z.number().int().min(0).nullable().optional(),
  vacancyRate: z.number().min(0).max(1).nullable().optional(),
  waltMonths: z.number().min(0).max(1200).nullable().optional(),
  rentIndexed: z.boolean().nullable().optional(),
  rentEscalation: z.boolean().nullable().optional(),
  rentUpsidePotential: z.number().int().min(0).nullable().optional(),

  modernizationBacklog: z.number().int().min(0).nullable().optional(),
  gegCompliant: z.boolean().nullable().optional(),

  commissionRate: z.number().min(0).max(20).nullable().optional(),
  commissionFree: z.boolean().nullable().optional(),
  buyerCommission: z.number().min(0).nullable().optional(),

  availableFrom: z.string().nullable().optional(),

  features: z.array(z.string().max(50)).max(40).optional(),
  highlights: z.array(z.string().max(50)).max(20).optional(),

  tenantCount: z.number().int().min(0).max(10000).nullable().optional(),
  anchorTenant: z.string().max(120).nullable().optional(),
  tenantSectors: z.array(z.string().max(50)).max(20).optional()
});

const ListingPatchSchema = ListingCreateSchema.partial().extend({
  status: ListingStatusEnum.optional()
});

/**
 * Anonymisiert ein Listing fürs Marketplace-Listing — entfernt die Felder,
 * die laut anonymizationLevel nicht gezeigt werden dürfen.
 */
function anonymizeListing<
  T extends {
    fullAddress: string | null;
    postalCode: string | null;
    district: string | null;
    city: string;
    anonymizationLevel: string;
  }
>(l: T): T {
  if (l.anonymizationLevel === "FULL_ADDRESS") {
    return l;
  }
  if (l.anonymizationLevel === "DISTRICT_ONLY") {
    return { ...l, fullAddress: null, postalCode: null };
  }
  // CITY_ONLY
  return { ...l, fullAddress: null, postalCode: null, district: null };
}

/**
 * Liefert die Demo-Inserate für /me/seed-demo-listings.
 * Bilder via Unsplash-Photo-IDs (stabile, frei lizensierte Architektur-Fotos).
 * Description enthält den Marker "[DEMO-INSERAT]" damit Reset funktioniert.
 */
function buildDemoListings() {
  // Helper für Unsplash-URLs — Format-Parameter sorgt für sinnvolle Größe + Zuschnitt
  const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;

  return [
    {
      title: "Saniertes 12-Einheiten-MFH in Berlin-Kreuzberg",
      description:
        "[DEMO-INSERAT]\n\nVollständig kernsaniertes Mehrfamilienhaus mit 12 Wohneinheiten in begehrter Kreuzberger Lage. Nach dem Erwerb 2019 wurde das Objekt komplett modernisiert — neue Heizung (Brennwerttherme + Solar), Fenster, Bäder und Elektroinstallation. Mietverträge sind durchgängig indexiert. Cashflow vom ersten Tag positiv, mittelfristig deutliches Mietsteigerungspotenzial nach Auslauf der Bestandsverträge.\n\nAusstattung: Aufzug, Keller, Hofgrundstück mit Stellplätzen.",
      propertyType: "MFH" as const,
      status: "ACTIVE" as const,
      askingPrice: 4_650_000,
      totalArea: 920,
      totalRent: 21_500,
      city: "Berlin",
      postalCode: "10997",
      district: "Kreuzberg",
      anonymizationLevel: "DISTRICT_ONLY" as const,
      yearBuilt: 1908,
      lastRenovation: 2019,
      condition: "REFURBISHED" as const,
      livingArea: 920,
      landArea: 410,
      floors: 5,
      residentialUnits: 12,
      commercialUnits: 0,
      energyClass: "C" as const,
      energyConsumption: 78,
      energyCarrier: "GAS" as const,
      heatingType: "Zentralheizung mit Solar-Unterstützung",
      actualRent: 19_800,
      vacancyRate: 0.04,
      waltMonths: 38,
      rentIndexed: true,
      rentEscalation: false,
      rentUpsidePotential: 1_700,
      modernizationBacklog: 0,
      gegCompliant: true,
      commissionRate: 3.57,
      commissionFree: false,
      features: ["Aufzug", "Keller", "Stellplatz", "Balkone", "Hofgrundstück"],
      highlights: ["Vollvermietet", "Kernsaniert", "Indexmiete", "Cashflow-positiv"],
      tenantCount: 11,
      tenantSectors: [],
      images: [
        u("1568605114967-8130f3a36994"),
        u("1582268611958-ebfd161ef9cf"),
        u("1560448204-e02f11c3d0e2"),
        u("1567496898669-ee935f5f647a"),
        u("1502672260266-1c1ef2d93688")
      ]
    },
    {
      title: "Geschäftshaus mit Vollvermietung — REWE als Anker",
      description:
        "[DEMO-INSERAT]\n\nProfessionell vermietetes Geschäftshaus in einer Mittelstadt-Innenstadt. Anchor-Tenant REWE (Restmietdauer > 8 Jahre, Indexmiete), zwei weitere Filialisten im Erdgeschoss, fünf Büroeinheiten in den Obergeschossen mit überwiegend lokalen Mittelstandsmietern.\n\nDas Objekt wurde 2021 fassadensaniert und mit moderner Wärmepumpen-Hybridheizung ausgestattet. WALT 6,2 Jahre, sehr stabile Cashflow-Story.",
      propertyType: "COMMERCIAL" as const,
      status: "ACTIVE" as const,
      askingPrice: 8_900_000,
      totalArea: 2_400,
      totalRent: 49_500,
      city: "Münster",
      postalCode: "48143",
      district: "Innenstadt",
      anonymizationLevel: "DISTRICT_ONLY" as const,
      yearBuilt: 1982,
      lastRenovation: 2021,
      condition: "MODERNIZED" as const,
      commercialArea: 2400,
      landArea: 1100,
      floors: 4,
      residentialUnits: 0,
      commercialUnits: 8,
      energyClass: "B" as const,
      energyConsumption: 62,
      energyCarrier: "HEAT_PUMP" as const,
      heatingType: "Wärmepumpe + Gas-Spitzenlast",
      actualRent: 49_500,
      vacancyRate: 0,
      waltMonths: 74,
      rentIndexed: true,
      rentEscalation: false,
      rentUpsidePotential: 2_400,
      modernizationBacklog: 80_000,
      gegCompliant: true,
      commissionRate: 0,
      commissionFree: true,
      features: ["Aufzug", "Klimatisiert", "Tiefgarage", "Schaufenster"],
      highlights: ["Vollvermietet", "Anchor-Tenant", "WALT 6+", "Provisionsfrei"],
      tenantCount: 8,
      anchorTenant: "REWE Markt GmbH",
      tenantSectors: ["Einzelhandel", "Büro", "Dienstleistung"],
      images: [
        u("1486406146926-c627a92ad1ab"),
        u("1497366216548-37526070297c"),
        u("1497366811353-6870744d04b2"),
        u("1497366754035-f200968a6e72")
      ]
    },
    {
      title: "Off-Market: 8-Familien-Bestand Hamburg-Eimsbüttel",
      description:
        "[DEMO-INSERAT]\n\nDiskreter Verkauf eines klassischen Hamburger Altbaus — kein Inserat auf Portalen, nur direktes Investoren-Targeting. Acht Wohneinheiten, gemischte Mieterstruktur, durchschnittlicher Mietspiegel-Abstand 18 % nach unten — entsprechendes Mietsteigerungspotenzial bei Mieterwechsel.\n\nObjekt befindet sich in Bewirtschaftungs-OK-Zustand, mittelfristig empfehlenswert: Bad-Sanierungen (~ 8.000 € pro Einheit) und neue Heizung (Pflicht ab 2028 nach GEG).",
      propertyType: "MFH" as const,
      status: "ACTIVE" as const,
      askingPrice: 3_200_000,
      totalArea: 640,
      totalRent: 11_900,
      city: "Hamburg",
      district: "Eimsbüttel",
      anonymizationLevel: "CITY_ONLY" as const,
      yearBuilt: 1924,
      lastRenovation: 2008,
      condition: "MAINTAINED" as const,
      livingArea: 640,
      landArea: 320,
      floors: 4,
      residentialUnits: 8,
      commercialUnits: 0,
      energyClass: "E" as const,
      energyConsumption: 145,
      energyCarrier: "GAS" as const,
      heatingType: "Zentralheizung Gas (Bj. 2008)",
      actualRent: 11_900,
      vacancyRate: 0,
      waltMonths: 14,
      rentIndexed: false,
      rentEscalation: false,
      rentUpsidePotential: 2_100,
      modernizationBacklog: 95_000,
      gegCompliant: false,
      commissionRate: 3.57,
      commissionFree: false,
      features: ["Keller", "Garten", "Stuckdecken"],
      highlights: ["Off-Market", "Mietsteigerungspotenzial", "Altbau"],
      tenantCount: 8,
      tenantSectors: [],
      images: [
        u("1572120360610-d971b9d7767c"),
        u("1564013799919-ab600027ffc6"),
        u("1502005229762-cf1b2da7c5d6"),
        u("1599809275671-b5942cabc7a2")
      ]
    },
    {
      title: "Wohn- und Geschäftshaus — Mischnutzung Leipzig-Plagwitz",
      description:
        "[DEMO-INSERAT]\n\nMischgenutztes Objekt mit Café im Erdgeschoss (10-Jahres-Vertrag, indexiert) und 6 Wohneinheiten darüber. Plagwitz hat sich in den letzten Jahren zu einem der gefragtesten Stadtteile Leipzigs entwickelt — Mietniveau zieht entsprechend an.\n\nBesondere Merkmale: 2017 energetisch saniert (Energieklasse B), neue Wärmepumpe, alle Wohnungen mit Balkon. WEG-fähige Aufteilung möglich, Teilungserklärung in Vorbereitung.",
      propertyType: "MIXED_USE" as const,
      status: "ACTIVE" as const,
      askingPrice: 2_750_000,
      totalArea: 580,
      totalRent: 13_400,
      city: "Leipzig",
      postalCode: "04229",
      district: "Plagwitz",
      anonymizationLevel: "DISTRICT_ONLY" as const,
      yearBuilt: 1898,
      lastRenovation: 2017,
      condition: "REFURBISHED" as const,
      livingArea: 460,
      commercialArea: 120,
      landArea: 280,
      floors: 4,
      residentialUnits: 6,
      commercialUnits: 1,
      energyClass: "B" as const,
      energyConsumption: 68,
      energyCarrier: "HEAT_PUMP" as const,
      heatingType: "Erdwärme-Wärmepumpe",
      actualRent: 13_400,
      vacancyRate: 0,
      waltMonths: 52,
      rentIndexed: true,
      rentEscalation: true,
      rentUpsidePotential: 900,
      modernizationBacklog: 0,
      gegCompliant: true,
      commissionRate: 3.57,
      commissionFree: false,
      features: ["Balkon", "Aufzug", "Keller", "Wärmepumpe"],
      highlights: ["Mischnutzung", "WEG-fähig", "Energieklasse B", "Anchor-Café"],
      tenantCount: 7,
      anchorTenant: "Café Lieblingsplatz",
      tenantSectors: ["Gastronomie", "Wohnen"],
      images: [
        u("1545324418-cc1a3fa10c00"),
        u("1493809842364-78817add7ffb"),
        u("1576941089067-2de3c901e126"),
        u("1560185007-c5ca9d2c014d")
      ]
    },
    {
      title: "Logistikhalle mit Anschlussgleis — Süddeutschland",
      description:
        "[DEMO-INSERAT]\n\n4.200 m² Logistikfläche an einem Standort mit eigenem Bahnanschluss — selten am Markt. Vollvermietet an einen mittelständischen Kontraktlogistiker, Vertrag mit Indexierung und 9 Jahren Restlaufzeit. Halle aus 2015 mit moderner Sprinkleranlage und 12-Tor-Verladung.\n\nIdeal für Family Offices oder Logistik-Spezialfonds: stabile Cashflow-Story, hochinvestiv-grade Mieter.",
      propertyType: "COMMERCIAL" as const,
      status: "ACTIVE" as const,
      askingPrice: 6_400_000,
      totalArea: 4_200,
      totalRent: 32_500,
      city: "Augsburg",
      district: "Lechhausen",
      anonymizationLevel: "DISTRICT_ONLY" as const,
      yearBuilt: 2015,
      condition: "MAINTAINED" as const,
      commercialArea: 4200,
      landArea: 8500,
      floors: 1,
      residentialUnits: 0,
      commercialUnits: 1,
      energyClass: "C" as const,
      energyConsumption: 42,
      energyCarrier: "GAS" as const,
      heatingType: "Hallenheizung Gas-Dunkelstrahler",
      actualRent: 32_500,
      vacancyRate: 0,
      waltMonths: 108,
      rentIndexed: true,
      rentEscalation: false,
      rentUpsidePotential: 0,
      modernizationBacklog: 0,
      gegCompliant: true,
      commissionRate: 0,
      commissionFree: true,
      features: ["Sprinkleranlage", "Verladetore", "Bahnanschluss", "Sozialräume"],
      highlights: ["Single-Tenant", "WALT 9+", "Bahnanschluss", "Provisionsfrei"],
      tenantCount: 1,
      anchorTenant: "Mittelständischer Kontraktlogistiker",
      tenantSectors: ["Logistik"],
      images: [
        u("1553413077-190dd305871c"),
        u("1586528116311-ad8dd3c8310d"),
        u("1601584115197-04ecc0da31d7"),
        u("1610978472146-d8c3a8b6d85b")
      ]
    }
  ];
}

// GET /me/listings — eigene Listings (alle Status, optional Filter)
app.get("/me/listings", async (req, res) => {
  const rawStatus = req.query.status;
  const parsedStatus = typeof rawStatus === "string"
    ? ListingStatusEnum.safeParse(rawStatus)
    : null;
  const listings = await prisma.listing.findMany({
    where: {
      ownerId: req.userId!,
      ...(parsedStatus?.success ? { status: parsedStatus.data } : {})
    },
    orderBy: { updatedAt: "desc" },
    include: { images: { orderBy: { sortOrder: "asc" } } }
  });
  return res.json(listings);
});

// POST /me/listings — neues Listing (immer als DRAFT angelegt)
app.post("/me/listings", async (req, res) => {
  const body = ListingCreateSchema.parse(req.body);
  const { availableFrom, features, highlights, tenantSectors, ...rest } = body;

  // --- Dedup-Window (Phase M5 — 2026-05-20) ----------------------------
  // Schutz gegen Doppel-Submit (Doppelklick, Enter-Taste, Mobile Double-Tap):
  // Wenn derselbe Owner in den letzten 60 Sekunden ein Listing mit
  // identischem Title + askingPrice + totalArea angelegt hat, geben wir
  // das bestehende zurueck statt ein zweites zu erzeugen. Marco hatte
  // ein versehentliches Duplikat — die Frontend-Sperre via useState war
  // nicht zuverlaessig genug.
  const dedupWindowMs = 60_000;
  const recentDuplicate = await prisma.listing.findFirst({
    where: {
      ownerId: req.userId!,
      title: rest.title,
      askingPrice: rest.askingPrice,
      totalArea: rest.totalArea,
      createdAt: { gte: new Date(Date.now() - dedupWindowMs) }
    },
    orderBy: { createdAt: "desc" },
    include: { images: { orderBy: { sortOrder: "asc" } } }
  });
  if (recentDuplicate) {
    return res.json(recentDuplicate);
  }
  // ---------------------------------------------------------------------

  const data = {
    ownerId: req.userId!,
    ...rest,
    description: rest.description ?? "",
    anonymizationLevel: rest.anonymizationLevel ?? "DISTRICT_ONLY",
    availableFrom: availableFrom ? new Date(availableFrom) : null,
    features: features ?? [],
    highlights: highlights ?? [],
    tenantSectors: tenantSectors ?? []
  };
  // Cast: Zod-Output-Type ist Subset von Prisma.ListingCreateInput
  // (alle neuen Felder optional in der DB), aber TS erkennt das nicht
  // automatisch wegen Spread-Inferenz. Defensive Cast.
  const listing = await prisma.listing.create({
    data: data as never,
    include: { images: { orderBy: { sortOrder: "asc" } } }
  });

  // Phase H3 — LISTING_ACTIVATED-Hook (selten relevant, weil neue Listings
  // i.d.R. als DRAFT angelegt werden, aber falls jemand direkt ACTIVE
  // einreicht, vergeben wir den Coin sofort).
  if (listing.status === "ACTIVE") {
    try {
      await earn(listing.ownerId, "LISTING_ACTIVATED", listing.id);
      await tryTriggerReferral(listing.ownerId);
    } catch {
      /* leise */
    }
  }

  return res.json(listing);
});

// GET /me/listings/:id — eigenes Listing-Detail (alle Felder, keine Anonymisierung)
app.get("/me/listings/:id", async (req, res) => {
  const listing = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    include: { images: { orderBy: { sortOrder: "asc" } } }
  });
  if (!listing) return res.status(404).json({ error: "Not found" });
  return res.json(listing);
});

// PATCH /me/listings/:id — Felder updaten
app.patch("/me/listings/:id", async (req, res) => {
  const body = ListingPatchSchema.parse(req.body);
  const owned = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  // Phase G3 — Listing-Limit beim Aktivieren (status: "ACTIVE").
  // Beim PATCH zählt nur, wenn Status ZU "ACTIVE" wechselt.
  if (body.status === "ACTIVE" && owned.status !== "ACTIVE") {
    const me = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { plan: true }
    });
    const plan = (me?.plan ?? "FREE") as PlanT;
    const limits = getPlanLimits(plan);
    if (limits.activeListingsMax != null) {
      const active = await countActiveListings(req.userId!);
      if (active >= limits.activeListingsMax) {
        return res.status(402).json(
          paywallBody({
            reason: "listing_limit_reached",
            message: `Du hast bereits ${active} aktive Inserate. Dein Plan (${plan}) erlaubt maximal ${limits.activeListingsMax}.`,
            upgradeTo: "INVESTOR_PRO",
            current: active,
            limit: limits.activeListingsMax
          })
        );
      }
    }
  }

  // availableFrom kommt als ISO-String — in Date umwandeln, oder null lassen
  const { availableFrom, ...rest } = body;
  const data: Record<string, unknown> = { ...rest };
  if (availableFrom !== undefined) {
    data.availableFrom = availableFrom ? new Date(availableFrom) : null;
  }

  const updated = await prisma.listing.update({
    where: { id: owned.id },
    data: data as never,
    include: { images: { orderBy: { sortOrder: "asc" } } }
  });

  // Phase H3 — LISTING_ACTIVATED-Hook beim Status-Wechsel zu ACTIVE.
  // Idempotent ueber refId=listing.id (siehe coins.ts), also wird derselbe
  // Coin pro Listing nur einmal vergeben — egal wie oft jemand
  // ACTIVE -> DRAFT -> ACTIVE toggelt. Anti-Farming nach Spec.
  if (body.status === "ACTIVE" && owned.status !== "ACTIVE") {
    try {
      await earn(updated.ownerId, "LISTING_ACTIVATED", updated.id);
      await tryTriggerReferral(updated.ownerId);
    } catch {
      /* leise */
    }
  }

  return res.json(updated);
});

// DELETE /me/listings/:id — Listing samt Bildern löschen (Cascade über Prisma)
app.delete("/me/listings/:id", async (req, res) => {
  const owned = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });
  await prisma.listing.delete({ where: { id: owned.id } });
  return res.json({ ok: true });
});

// POST /me/seed-demo-listings — Beispiel-Inserate mit echten Bildern anlegen.
// Idempotent: legt nur an, wenn der User noch keine ACTIVE-Listings hat.
// Bilder kommen von Unsplash (Foto-CDN, frei lizensiert für Demo).
app.post("/me/seed-demo-listings", async (req, res) => {
  const existing = await prisma.listing.count({
    where: { ownerId: req.userId!, status: "ACTIVE" }
  });
  if (existing > 0) {
    return res.json({ created: 0, message: "Bereits aktive Inserate vorhanden — kein Seed nötig." });
  }

  const demos = buildDemoListings();
  let created = 0;
  for (const demo of demos) {
    const { images, ...rest } = demo as { images: string[] } & Record<string, unknown>;
    const data = {
      ownerId: req.userId!,
      ...rest,
      images: {
        create: images.map((url: string, i: number) => ({
          url,
          sortOrder: i,
          alt: `${(rest as { title: string }).title} – Bild ${i + 1}`
        }))
      }
    };
    await prisma.listing.create({ data: data as never });
    created++;
  }

  return res.json({ created, message: `${created} Demo-Inserate angelegt.` });
});

// DELETE /me/seed-demo-listings — alle eigenen Demo-Inserate (per Marker im Description)
// wieder entfernen, falls der User reset will.
app.delete("/me/seed-demo-listings", async (req, res) => {
  const result = await prisma.listing.deleteMany({
    where: {
      ownerId: req.userId!,
      description: { contains: "[DEMO-INSERAT]" }
    }
  });
  return res.json({ deleted: result.count });
});

// POST /me/listings/:id/images — Bild-URL anhängen (Frontend hat sie schon
// hochgeladen, hier wird sie nur registriert).
app.post("/me/listings/:id/images", async (req, res) => {
  const body = z
    .object({
      url: z.string().url().max(2000),
      alt: z.string().max(300).nullable().optional(),
      sortOrder: z.number().int().min(0).max(9999).optional()
    })
    .parse(req.body);
  const owned = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });
  const lastSort = await prisma.listingImage.findFirst({
    where: { listingId: owned.id },
    orderBy: { sortOrder: "desc" }
  });
  const sortOrder = body.sortOrder ?? (lastSort ? lastSort.sortOrder + 1 : 0);
  const image = await prisma.listingImage.create({
    data: {
      listingId: owned.id,
      url: body.url,
      alt: body.alt ?? null,
      sortOrder
    }
  });
  return res.json(image);
});

// DELETE /me/listings/:listingId/images/:imageId
app.delete("/me/listings/:listingId/images/:imageId", async (req, res) => {
  const owned = await prisma.listing.findFirst({
    where: { id: req.params.listingId, ownerId: req.userId! }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });
  const img = await prisma.listingImage.findFirst({
    where: { id: req.params.imageId, listingId: owned.id }
  });
  if (!img) return res.status(404).json({ error: "Image not found" });
  await prisma.listingImage.delete({ where: { id: img.id } });
  return res.json({ ok: true });
});

// PATCH /me/listings/:id/images/reorder — Reihenfolge aller Bilder eines
// Inserats neu setzen.
//
// Body: { orderedIds: string[] } — die Image-IDs in der gewuenschten
// Anzeige-Reihenfolge. Das erste Bild wird Cover-Bild (sortOrder 0).
//
// Validierung:
//   - Listing gehoert dem User (Owner-Filter)
//   - `orderedIds` enthaelt GENAU alle ImageIDs des Listings (Set-Gleichheit)
//     — verhindert, dass jemand fremde Image-IDs reinschiebt oder welche
//     vergisst
//
// Update laeuft als Transaction; bei einem Fehler bleibt die alte
// Reihenfolge erhalten.
app.patch("/me/listings/:id/images/reorder", async (req, res) => {
  const body = z
    .object({
      orderedIds: z.array(z.string().min(1)).min(1).max(200)
    })
    .parse(req.body);

  const owned = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    include: { images: { select: { id: true } } }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  const existingIds = new Set(owned.images.map((i) => i.id));
  const submittedIds = new Set(body.orderedIds);

  if (submittedIds.size !== body.orderedIds.length) {
    return res.status(400).json({ error: "orderedIds enthaelt Duplikate" });
  }
  if (existingIds.size !== submittedIds.size) {
    return res.status(400).json({
      error: `orderedIds muss alle ${existingIds.size} Bild-IDs enthalten, hat ${submittedIds.size}`
    });
  }
  for (const id of submittedIds) {
    if (!existingIds.has(id)) {
      return res.status(400).json({
        error: `Bild-ID ${id} gehoert nicht zu diesem Inserat`
      });
    }
  }

  // Transaction: alle sortOrder-Werte in einem Rutsch setzen.
  await prisma.$transaction(
    body.orderedIds.map((imageId, index) =>
      prisma.listingImage.update({
        where: { id: imageId },
        data: { sortOrder: index }
      })
    )
  );

  const updated = await prisma.listingImage.findMany({
    where: { listingId: owned.id },
    orderBy: { sortOrder: "asc" }
  });
  return res.json(updated);
});

// --- Inquiries (Push D) ----------------------------------------

const InquiryStatusEnum = z.enum(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"]);

/**
 * Reduziert ein Listing auf die Felder, die ein Investor nach
 * Inquiry-Erstellung sehen darf.
 *
 * - Bei ACCEPTED: Voll-Adresse wird freigegeben (Verkäufer hat eingewilligt)
 * - Sonst: Wie im Marketplace anonymisiert
 */
function listingViewForInvestor(
  l: {
    id: string;
    title: string;
    description: string;
    propertyType: string;
    askingPrice: number;
    totalArea: number;
    totalRent: number | null;
    city: string;
    postalCode: string | null;
    district: string | null;
    fullAddress: string | null;
    anonymizationLevel: string;
    status: string;
    images: { id: string; url: string; alt: string | null; sortOrder: number; createdAt: Date; listingId: string }[];
  },
  inquiryStatus: string
) {
  const showFullAddress = inquiryStatus === "ACCEPTED";
  if (showFullAddress) {
    return l;
  }
  // Sonst Anonymisierung wie im Marketplace
  if (l.anonymizationLevel === "FULL_ADDRESS") return l;
  if (l.anonymizationLevel === "DISTRICT_ONLY") {
    return { ...l, fullAddress: null, postalCode: null };
  }
  return { ...l, fullAddress: null, postalCode: null, district: null };
}

/**
 * Investor-Profil-Auszug für den Verkäufer einer Inquiry.
 * Zeigt das Profil unabhängig von visibility — die Inquiry-Aktion zählt
 * als Einwilligung des Investors. Dafür wird im Frontend transparent
 * gemacht, dass der Verkäufer das Profil nur durch die Anfrage sieht.
 */
async function investorSnapshotFor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      investorProfile: true,
      trackrecordItems: {
        orderBy: [{ year: "desc" }, { createdAt: "desc" }],
        take: 20
      }
    }
  });
  return user;
}

// POST /me/inquiries — Investor stellt Anfrage
app.post("/me/inquiries", async (req, res) => {
  const body = z
    .object({
      listingId: z.string().min(1),
      message: z.string().min(10).max(4000)
    })
    .parse(req.body);

  const listing = await prisma.listing.findUnique({
    where: { id: body.listingId }
  });
  if (!listing) return res.status(404).json({ error: "Listing nicht gefunden" });
  if (listing.status !== "ACTIVE") {
    return res.status(400).json({ error: "Listing ist nicht aktiv" });
  }
  if (listing.ownerId === req.userId!) {
    return res.status(400).json({ error: "Eigene Listings kann man nicht anfragen" });
  }

  const existingPending = await prisma.inquiry.findFirst({
    where: {
      listingId: body.listingId,
      investorId: req.userId!,
      status: "PENDING"
    }
  });
  if (existingPending) {
    return res.status(409).json({
      error: "Es liegt bereits eine offene Anfrage zu diesem Listing vor",
      inquiryId: existingPending.id
    });
  }

  // Phase G3 — Inquiry-Limit (Free: 3 in 30d). Pro: unlimited.
  const me = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { plan: true }
  });
  const plan = (me?.plan ?? "FREE") as PlanT;
  const limits = getPlanLimits(plan);
  if (limits.inquiriesPer30dMax != null) {
    const sent = await countInquiriesLast30d(req.userId!);
    if (sent >= limits.inquiriesPer30dMax) {
      return res.status(402).json(
        paywallBody({
          reason: "inquiry_limit_reached",
          message: `Du hast in den letzten 30 Tagen ${sent} Anfragen abgeschickt — das Limit deines Plans (${plan}) ist erreicht. Investor Pro entsperrt unlimitierte Anfragen.`,
          upgradeTo: "INVESTOR_PRO",
          current: sent,
          limit: limits.inquiriesPer30dMax
        })
      );
    }
  }

  const created = await prisma.inquiry.create({
    data: {
      listingId: body.listingId,
      investorId: req.userId!,
      message: body.message
    }
  });
  return res.json(created);
});

// GET /me/inquiries — eigene gesendete Anfragen (Investor-Sicht)
app.get("/me/inquiries", async (req, res) => {
  const inquiries = await prisma.inquiry.findMany({
    where: { investorId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 5 },
          owner: { select: { id: true, name: true, email: true, role: true } }
        }
      }
    }
  });

  // Listing-View je nach Inquiry-Status anonymisieren
  const view = inquiries.map((i) => ({
    id: i.id,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    status: i.status,
    message: i.message,
    response: i.response,
    respondedAt: i.respondedAt,
    listing: listingViewForInvestor(i.listing, i.status),
    // Verkäufer-Email nur freigeben, wenn ACCEPTED
    seller: i.status === "ACCEPTED"
      ? i.listing.owner
      : { id: i.listing.owner.id, name: i.listing.owner.name, role: i.listing.owner.role }
  }));

  return res.json(view);
});

// GET /me/inquiries/:id — eigene Anfrage im Detail
app.get("/me/inquiries/:id", async (req, res) => {
  const inquiry = await prisma.inquiry.findFirst({
    where: { id: req.params.id, investorId: req.userId! },
    include: {
      listing: {
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          owner: { select: { id: true, name: true, email: true, role: true } }
        }
      },
      ratings: {
        include: {
          fromUser: { select: { id: true, name: true, role: true } }
        }
      }
    }
  });
  if (!inquiry) return res.status(404).json({ error: "Not found" });

  const myRating = inquiry.ratings.find((r) => r.fromUserId === req.userId!) ?? null;
  const sellerRating = inquiry.ratings.find((r) => r.fromUserId === inquiry.listing.ownerId) ?? null;
  const sellerSummary = await ratingSummaryFor(inquiry.listing.ownerId);

  const canRate = inquiry.status === "ACCEPTED"
    && inquiry.listing.status === "SOLD"
    && !myRating;

  return res.json({
    id: inquiry.id,
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
    status: inquiry.status,
    message: inquiry.message,
    response: inquiry.response,
    respondedAt: inquiry.respondedAt,
    listing: listingViewForInvestor(inquiry.listing, inquiry.status),
    seller: inquiry.status === "ACCEPTED"
      ? inquiry.listing.owner
      : { id: inquiry.listing.owner.id, name: inquiry.listing.owner.name, role: inquiry.listing.owner.role },
    sellerSummary,
    myRating,
    sellerRating,
    canRate
  });
});

// DELETE /me/inquiries/:id — Investor zieht Anfrage zurück (status=WITHDRAWN)
app.delete("/me/inquiries/:id", async (req, res) => {
  const inquiry = await prisma.inquiry.findFirst({
    where: { id: req.params.id, investorId: req.userId! }
  });
  if (!inquiry) return res.status(404).json({ error: "Not found" });
  if (inquiry.status !== "PENDING") {
    return res.status(400).json({ error: "Nur PENDING-Anfragen können zurückgezogen werden" });
  }
  const updated = await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { status: "WITHDRAWN" }
  });
  return res.json(updated);
});

// GET /me/inquiries-received — alle Anfragen auf eigenen Listings,
// aggregiert (Verkäufer-Dashboard). Filter ?status=PENDING|ACCEPTED|...
app.get("/me/inquiries-received", async (req, res) => {
  const q = z
    .object({
      status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"]).optional()
    })
    .parse(req.query);

  const where: Record<string, unknown> = {
    listing: { is: { ownerId: req.userId! } }
  };
  if (q.status) where.status = q.status;

  const inquiries = await prisma.inquiry.findMany({
    where: where as never,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      listing: { select: { id: true, title: true, city: true } },
      investor: { select: { id: true, name: true } }
    }
  });
  return res.json(inquiries);
});

// GET /me/listings/:id/inquiries — Anfragen auf eigenem Listing (Verkäufer-Sicht)
app.get("/me/listings/:id/inquiries", async (req, res) => {
  const owned = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!owned) return res.status(404).json({ error: "Listing not found" });

  const inquiries = await prisma.inquiry.findMany({
    where: { listingId: owned.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  // Investor-Profil-Auszug + Rating-Status pro Inquiry laden
  const enriched = await Promise.all(
    inquiries.map(async (inq) => {
      const investor = await investorSnapshotFor(inq.investorId);
      const investorRating = await ratingSummaryFor(inq.investorId);
      const ratings = await prisma.rating.findMany({
        where: { inquiryId: inq.id }
      });
      const myRating = ratings.find((r) => r.fromUserId === req.userId!) ?? null;
      const investorRatingOnMe = ratings.find((r) => r.fromUserId === inq.investorId) ?? null;
      const canRate = inq.status === "ACCEPTED"
        && owned.status === "SOLD"
        && !myRating;

      return {
        id: inq.id,
        createdAt: inq.createdAt,
        updatedAt: inq.updatedAt,
        status: inq.status,
        message: inq.message,
        response: inq.response,
        respondedAt: inq.respondedAt,
        investor,
        investorSummary: investorRating,
        myRating,
        investorRatingOnMe,
        canRate
      };
    })
  );

  return res.json({
    listingStatus: owned.status,
    inquiries: enriched
  });
});

// PATCH /me/inquiries/:id/respond — Verkäufer akzeptiert oder lehnt ab
app.patch("/me/inquiries/:id/respond", async (req, res) => {
  const body = z
    .object({
      status: z.enum(["ACCEPTED", "REJECTED"]),
      response: z.string().max(2000).nullable().optional()
    })
    .parse(req.body);

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: req.params.id },
    include: { listing: true }
  });
  if (!inquiry) return res.status(404).json({ error: "Not found" });
  if (inquiry.listing.ownerId !== req.userId!) {
    return res.status(403).json({ error: "Nicht der Eigentümer dieses Listings" });
  }
  if (inquiry.status !== "PENDING") {
    return res.status(400).json({ error: "Nur PENDING-Anfragen können beantwortet werden" });
  }

  const updated = await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: {
      status: body.status,
      response: body.response ?? null,
      respondedAt: new Date()
    }
  });

  // Komfort-Funktion: Bei erstem ACCEPT auf einem Listing wechselt der
  // Listing-Status automatisch zu IN_NEGOTIATION (Verkäufer kann das später
  // im Edit-Modus zurückstellen, wenn er trotzdem mehrere Investoren parallel
  // ansprechen möchte).
  if (body.status === "ACCEPTED" && inquiry.listing.status === "ACTIVE") {
    await prisma.listing.update({
      where: { id: inquiry.listing.id },
      data: { status: "IN_NEGOTIATION" }
    });
  }

  // Phase J2 — Auto-Trigger: bei ACCEPT automatisch SaleProcess anlegen
  // (sofern noch keiner zur Inquiry existiert). Eintrag im Stage-Audit-Log.
  // Verkaeufer-Sicht: "Verkaufsabwicklung" zeigt sofort den neuen Prozess.
  if (body.status === "ACCEPTED") {
    try {
      const existing = await prisma.saleProcess.findUnique({
        where: { inquiryId: inquiry.id },
        select: { id: true }
      });
      if (!existing) {
        const proc = await prisma.saleProcess.create({
          data: {
            listingId: inquiry.listingId,
            inquiryId: inquiry.id,
            sellerId: inquiry.listing.ownerId,
            buyerId: inquiry.investorId,
            currentStage: "ANFRAGE_AKZEPTIERT",
            stageEnteredAt: new Date()
          }
        });
        await prisma.saleStageEntry.create({
          data: {
            processId: proc.id,
            stage: "ANFRAGE_AKZEPTIERT",
            note: "Automatisch angelegt nach Accept der Anfrage.",
            byUserId: req.userId!
          }
        });
      }
    } catch {
      /* leise — Verkaufsabwicklung ist bequemer Add-on, kein Pflicht-Pfad */
    }
  }

  // Phase H3 — SELLER_CONTACTED-Hook fuer den Investor (Anfrager).
  // Triggert sobald der Verkaeufer antwortet, egal ob ACCEPTED oder REJECTED —
  // die Logik aus dem MVP-Konzept ist "Verkaeufer hat geantwortet, Investor
  // kommt mit echtem Lead in Kontakt". Idempotent ueber inquiryId.
  try {
    await earn(inquiry.investorId, "SELLER_CONTACTED", inquiry.id);
  } catch {
    /* leise */
  }

  return res.json(updated);
});

// --- Ratings (Push E) ------------------------------------------

const RatingDirectionEnum = z.enum(["INVESTOR_TO_SELLER", "SELLER_TO_INVESTOR"]);

/**
 * Aggregiert Bewertungen für einen User: Durchschnittliche Sterne + Anzahl.
 * Liefert null wenn keine Ratings vorhanden, damit das Frontend zwischen
 * "noch keine Bewertungen" und "schlecht bewertet" unterscheiden kann.
 */
async function ratingSummaryFor(userId: string) {
  const ratings = await prisma.rating.findMany({
    where: { toUserId: userId },
    select: { stars: true }
  });
  if (ratings.length === 0) return { avg: null, count: 0 };
  const sum = ratings.reduce((s, r) => s + r.stars, 0);
  return {
    avg: Math.round((sum / ratings.length) * 10) / 10, // 1 Nachkommastelle
    count: ratings.length
  };
}

// POST /me/ratings — neue Bewertung (Investor→Verkäufer ODER Verkäufer→Investor)
app.post("/me/ratings", async (req, res) => {
  const body = z
    .object({
      inquiryId: z.string().min(1),
      stars: z.number().int().min(1).max(5),
      body: z.string().min(20).max(4000)
    })
    .parse(req.body);

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: body.inquiryId },
    include: { listing: true }
  });
  if (!inquiry) return res.status(404).json({ error: "Inquiry nicht gefunden" });
  if (inquiry.status !== "ACCEPTED") {
    return res.status(400).json({ error: "Bewertung nur für angenommene Anfragen möglich" });
  }
  if (inquiry.listing.status !== "SOLD") {
    return res.status(400).json({
      error: "Bewertung erst nach Listing-Status SOLD möglich"
    });
  }

  // Richtung bestimmen je nach User
  let direction: "INVESTOR_TO_SELLER" | "SELLER_TO_INVESTOR";
  let toUserId: string;
  if (req.userId! === inquiry.investorId) {
    direction = "INVESTOR_TO_SELLER";
    toUserId = inquiry.listing.ownerId;
  } else if (req.userId! === inquiry.listing.ownerId) {
    direction = "SELLER_TO_INVESTOR";
    toUserId = inquiry.investorId;
  } else {
    return res.status(403).json({ error: "Nicht Teil dieser Inquiry" });
  }

  const existing = await prisma.rating.findFirst({
    where: { inquiryId: inquiry.id, direction }
  });
  if (existing) {
    return res.status(409).json({
      error: "Bewertung in dieser Richtung existiert bereits",
      ratingId: existing.id
    });
  }

  const created = await prisma.rating.create({
    data: {
      inquiryId: inquiry.id,
      fromUserId: req.userId!,
      toUserId,
      direction,
      stars: body.stars,
      body: body.body
    }
  });
  return res.json(created);
});

// GET /me/ratings/given — abgegebene Bewertungen (mit Inquiry+Listing+Empfänger)
app.get("/me/ratings/given", async (req, res) => {
  const ratings = await prisma.rating.findMany({
    where: { fromUserId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      toUser: { select: { id: true, name: true, role: true } },
      inquiry: {
        select: {
          id: true,
          listing: { select: { id: true, title: true, city: true, propertyType: true } }
        }
      }
    }
  });
  return res.json(ratings);
});

// GET /me/ratings/received — erhaltene Bewertungen
app.get("/me/ratings/received", async (req, res) => {
  const ratings = await prisma.rating.findMany({
    where: { toUserId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { id: true, name: true, role: true } },
      inquiry: {
        select: {
          id: true,
          listing: { select: { id: true, title: true, city: true, propertyType: true } }
        }
      }
    }
  });
  const summary = await ratingSummaryFor(req.userId!);
  return res.json({ summary, ratings });
});

// POST /me/ratings/:id/rebuttal — Gegendarstellung (nur der Bewertete)
app.post("/me/ratings/:id/rebuttal", async (req, res) => {
  const body = z
    .object({
      rebuttal: z.string().min(20).max(4000)
    })
    .parse(req.body);

  const rating = await prisma.rating.findUnique({ where: { id: req.params.id } });
  if (!rating) return res.status(404).json({ error: "Rating nicht gefunden" });
  if (rating.toUserId !== req.userId!) {
    return res.status(403).json({ error: "Nur der Bewertete kann eine Gegendarstellung abgeben" });
  }
  if (rating.rebuttal) {
    return res.status(409).json({ error: "Gegendarstellung existiert bereits" });
  }

  const updated = await prisma.rating.update({
    where: { id: rating.id },
    data: {
      rebuttal: body.rebuttal,
      rebuttalAt: new Date()
    }
  });
  return res.json(updated);
});

// /users/* nimmt requireAuth auf Sub-Pfad-Ebene, damit /me-Routes nicht
// betroffen sind (sonst hätten wir doppelte Middleware-Anwendung).
app.use("/users", requireAuth);

// GET /users/:id/ratings — public Ratings + Summary für einen User
app.get("/users/:id/ratings", async (req, res) => {
  const targetId = req.params.id;
  const ratings = await prisma.rating.findMany({
    where: { toUserId: targetId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      fromUser: { select: { id: true, name: true, role: true } },
      inquiry: {
        select: {
          listing: { select: { title: true, city: true, propertyType: true } }
        }
      }
    }
  });
  const summary = await ratingSummaryFor(targetId);
  return res.json({ summary, ratings });
});

// --- Marketplace (öffentlich für eingeloggte User) --------------

// GET /marketplace — aktive Listings mit Filter, anonymisiert
app.get("/marketplace", async (req, res) => {
  const q = z
    .object({
      city: z.string().optional(),
      type: AssetTypeEnum.optional(),
      priceMin: z.coerce.number().int().min(0).optional(),
      priceMax: z.coerce.number().int().min(0).optional(),
      areaMin: z.coerce.number().min(0).optional(),

      // --- USP-Filter (Investor-Sicht) ---
      yieldMin: z.coerce.number().min(0).max(50).optional(),       // Bruttorendite % (post-filter)
      waltMin: z.coerce.number().min(0).max(1200).optional(),      // WALT in Monaten
      energyMin: EnergyClassEnum.optional(),                       // Min-Energieklasse
      fullyRented: z.coerce.boolean().optional(),                  // vacancyRate ≤ 5%
      offMarket: z.coerce.boolean().optional(),                    // anonymizationLevel = CITY_ONLY
      withAnchor: z.coerce.boolean().optional(),                   // anchorTenant gesetzt
      modernizationOnly: z.coerce.boolean().optional(),            // modernizationBacklog > 0
      indexedRent: z.coerce.boolean().optional()                   // rentIndexed = true
    })
    .parse(req.query);

  // Off-Market-Filter ist Investor-Pro-only (Phase G3 Feature-Gating).
  if (q.offMarket) {
    const me = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { plan: true }
    });
    const plan = (me?.plan ?? "FREE") as PlanT;
    if (!getPlanLimits(plan).canSeeOffMarket) {
      return res.status(402).json(
        paywallBody({
          reason: "off_market_locked",
          message: "Off-Market-Inserate sind Investor-Pro-Feature. Upgrade unter /pricing.",
          upgradeTo: "INVESTOR_PRO"
        })
      );
    }
  }

  const priceFilter: { gte?: number; lte?: number } = {};
  if (q.priceMin != null) priceFilter.gte = q.priceMin;
  if (q.priceMax != null) priceFilter.lte = q.priceMax;

  // Energieklasse-Range: alle Klassen >= q.energyMin (also "besser oder gleich")
  // Reihenfolge: A_PLUS > A > B > C > D > E > F > G > H
  const ENERGY_ORDER: ReadonlyArray<z.infer<typeof EnergyClassEnum>> = [
    "A_PLUS", "A", "B", "C", "D", "E", "F", "G", "H"
  ];
  const energyClassesInScope = q.energyMin
    ? Array.from(ENERGY_ORDER.slice(0, ENERGY_ORDER.indexOf(q.energyMin) + 1))
    : null;

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      ...(q.city ? { city: { contains: q.city, mode: "insensitive" as const } } : {}),
      ...(q.type ? { propertyType: q.type } : {}),
      ...(Object.keys(priceFilter).length > 0 ? { askingPrice: priceFilter } : {}),
      ...(q.areaMin != null ? { totalArea: { gte: q.areaMin } } : {}),
      ...(q.waltMin != null ? { waltMonths: { gte: q.waltMin } } : {}),
      ...(energyClassesInScope ? { energyClass: { in: energyClassesInScope as never } } : {}),
      ...(q.fullyRented ? { OR: [{ vacancyRate: null }, { vacancyRate: { lte: 0.05 } }] } : {}),
      ...(q.offMarket ? { anonymizationLevel: "CITY_ONLY" } : {}),
      ...(q.withAnchor ? { anchorTenant: { not: null } } : {}),
      ...(q.modernizationOnly ? { modernizationBacklog: { gt: 0 } } : {}),
      ...(q.indexedRent ? { rentIndexed: true } : {})
    },
    orderBy: { updatedAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 5 },
      owner: { select: { id: true, name: true, role: true, plan: true } }
    },
    take: 200
  });

  // Post-Filter für yieldMin (kann nicht direkt in Prisma da computed)
  const yieldFiltered =
    q.yieldMin != null
      ? listings.filter((l) => {
          if (!l.totalRent || l.askingPrice <= 0) return false;
          const grossYield = ((l.totalRent * 12) / l.askingPrice) * 100;
          return grossYield >= (q.yieldMin as number);
        })
      : listings;

  // Phase G4 + H6 — Sortier-Layer:
  //   1) Stripe-Premium  (featuredUntil > now)            -> +1000
  //   2) Coin-Feed-Boost (Owner hat aktiven SPEND_FEED_BOOST) -> +100
  //   3) Coin-Highlight  (Listing in active highlights)   -> +10
  //   4) Tiebreaker: updatedAt-DESC
  //
  // Wir laden die zwei Sets parallel (jeweils ein DB-Roundtrip).
  const nowMs = Date.now();
  const [highlightedIds, feedBoostedOwnerIds] = await Promise.all([
    getHighlightedListingIds(),
    getFeedBoostedUserIds()
  ]);

  function rankScore(l: (typeof yieldFiltered)[number]): number {
    let s = 0;
    if (l.featuredUntil && l.featuredUntil.getTime() > nowMs) s += 1000;
    if (feedBoostedOwnerIds.has(l.ownerId)) s += 100;
    if (highlightedIds.has(l.id)) s += 10;
    return s;
  }

  yieldFiltered.sort((a, b) => {
    const sa = rankScore(a);
    const sb = rankScore(b);
    if (sa !== sb) return sb - sa;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  // Bewertungs-Summary pro Verkäufer dazuladen + Verifiziert-Flag + Coin-Flags
  const enriched = await Promise.all(
    yieldFiltered.slice(0, 100).map(async (l) => {
      const ownerPlan = l.owner?.plan;
      const ownerVerified =
        ownerPlan === "INVESTOR_PRO" || ownerPlan === "SELLER_PRO";
      const featured =
        !!l.featuredUntil && l.featuredUntil.getTime() > nowMs;
      const coinHighlighted = highlightedIds.has(l.id);
      const coinFeedBoosted = feedBoostedOwnerIds.has(l.ownerId);
      const anonymized = anonymizeListing(l);
      // owner.plan im Response weglassen — Plan ist intern.
      const ownerOut = anonymized.owner
        ? {
            id: anonymized.owner.id,
            name: anonymized.owner.name,
            role: anonymized.owner.role
          }
        : null;
      return {
        ...anonymized,
        owner: ownerOut,
        ownerVerified,
        featured,
        coinHighlighted,
        coinFeedBoosted,
        sellerRating: await ratingSummaryFor(l.ownerId)
      };
    })
  );
  return res.json(enriched);
});

// GET /marketplace/:id — Listing-Detail (anonymisiert)
// Auch IN_NEGOTIATION-Listings werden hier angezeigt, damit Investoren mit
// PENDING-Inquiry den Stand ihrer Anfrage weiter sehen.
app.get("/marketplace/:id", async (req, res) => {
  const listing = await prisma.listing.findFirst({
    where: {
      id: req.params.id,
      status: { in: ["ACTIVE", "IN_NEGOTIATION"] }
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, name: true, role: true, plan: true } }
    }
  });
  if (!listing) return res.status(404).json({ error: "Not found" });

  // Status der eigenen Inquiry beilegen, damit das Frontend den Button
  // korrekt rendern kann (kein Double-Submit, ggf. Hinweis auf bestehende Anfrage).
  const myInquiry = await prisma.inquiry.findFirst({
    where: {
      listingId: listing.id,
      investorId: req.userId!,
      status: { in: ["PENDING", "ACCEPTED"] }
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, createdAt: true }
  });

  const ownerPlan = listing.owner?.plan;
  const ownerVerified =
    ownerPlan === "INVESTOR_PRO" || ownerPlan === "SELLER_PRO";
  const featured =
    !!listing.featuredUntil && listing.featuredUntil.getTime() > Date.now();

  const anonymized = anonymizeListing(listing);
  // owner.plan im Response weglassen — Plan ist intern.
  const ownerOut = anonymized.owner
    ? {
        id: anonymized.owner.id,
        name: anonymized.owner.name,
        role: anonymized.owner.role
      }
    : null;

  return res.json({
    ...anonymized,
    owner: ownerOut,
    ownerVerified,
    featured,
    myInquiry,
    isOwner: listing.ownerId === req.userId!,
    sellerRating: await ratingSummaryFor(listing.ownerId)
  });
});

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Verbose Logging für Railway-Logs — hilft beim Debuggen von 500ern.
  const stack = err instanceof Error ? err.stack : String(err);
  console.error(`[${req.method} ${req.path}] 500 error:`, stack);
  const message = err instanceof Error ? err.message : "Internal server error";
  return res.status(500).json({ error: message, path: req.path });
});

// Express 5: async-Handler-Errors auch fangen (sollte automatisch sein,
// aber sicherheitshalber mit einer Wrapper-Variante getestet werden falls
// ein unhandled async error in 500 ohne Stack mündet).

// =========================================================
// Phase G1 — Stripe-Billing-Endpoints
// =========================================================

const CheckoutBodySchema = z.object({
  plan: z.enum(["INVESTOR_PRO", "SELLER_PRO"]),
  interval: z.enum(["monthly", "yearly"]).default("monthly")
});

function priceIdFor(plan: "INVESTOR_PRO" | "SELLER_PRO", interval: "monthly" | "yearly"): string {
  if (plan === "INVESTOR_PRO") {
    return interval === "yearly" ? STRIPE_PRICE_INVESTOR_YEARLY : STRIPE_PRICE_INVESTOR_MONTHLY;
  }
  return interval === "yearly" ? STRIPE_PRICE_SELLER_YEARLY : STRIPE_PRICE_SELLER_MONTHLY;
}

function planFromPriceId(priceId: string): "INVESTOR_PRO" | "SELLER_PRO" | null {
  if (priceId === STRIPE_PRICE_INVESTOR_MONTHLY || priceId === STRIPE_PRICE_INVESTOR_YEARLY) {
    return "INVESTOR_PRO";
  }
  if (priceId === STRIPE_PRICE_SELLER_MONTHLY || priceId === STRIPE_PRICE_SELLER_YEARLY) {
    return "SELLER_PRO";
  }
  return null;
}

// GET /me/billing — aktueller Plan + Status
app.get("/me/billing", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: {
      plan: true,
      planValidUntil: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true
    }
  });
  if (!user) return res.status(404).json({ error: "Not found" });
  return res.json({
    plan: user.plan,
    planValidUntil: user.planValidUntil,
    hasSubscription: !!user.stripeSubscriptionId,
    stripeReady: !!stripe
  });
});

// POST /me/billing/checkout — startet Stripe-Checkout
app.post("/me/billing/checkout", async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

  const body = CheckoutBodySchema.parse(req.body);
  const priceId = priceIdFor(body.plan, body.interval);
  if (!priceId) {
    return res.status(503).json({ error: `Stripe price not configured for ${body.plan} ${body.interval}` });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, name: true, stripeCustomerId: true }
  });
  if (!user) return res.status(404).json({ error: "Not found" });

  // Customer anlegen, falls noch keiner existiert
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id }
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId }
    });
  }

  const frontend = (process.env.FRONTEND_ORIGIN?.split(",")[0] ?? "https://infinityoikos.com").trim();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${frontend}/profile?billing=success`,
    cancel_url: `${frontend}/profile?billing=cancelled`,
    allow_promotion_codes: true,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan: body.plan, interval: body.interval },
    subscription_data: {
      metadata: { userId: user.id, plan: body.plan }
    }
  });

  return res.json({ url: session.url });
});

// POST /me/billing/portal — Stripe Customer Portal (Karte/Cancel/Plan)
app.post("/me/billing/portal", async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Stripe not configured" });

  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { stripeCustomerId: true }
  });
  if (!user?.stripeCustomerId) {
    return res.status(409).json({ error: "Kein Abo aktiv — bitte zuerst eines starten." });
  }

  const frontend = (process.env.FRONTEND_ORIGIN?.split(",")[0] ?? "https://infinityoikos.com").trim();
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${frontend}/profile`
  });
  return res.json({ url: portal.url });
});

// POST /me/listings/:id/checkout-feature — Stripe Checkout für Premium-Listing
// (one-off Zahlung, 30 Tage Top-Position).
app.post("/me/listings/:id/checkout-feature", async (req, res) => {
  if (!stripe) return res.status(503).json({ error: "Stripe not configured" });
  if (!STRIPE_PRICE_PREMIUM_LISTING) {
    return res.status(503).json({
      error: "STRIPE_PRICE_PREMIUM_LISTING ist nicht gesetzt — siehe deploy/STRIPE-SETUP.md"
    });
  }

  const listing = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!listing) return res.status(404).json({ error: "Listing nicht gefunden oder nicht deins." });

  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, name: true, stripeCustomerId: true }
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id }
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId }
    });
  }

  const frontend = (process.env.FRONTEND_ORIGIN?.split(",")[0] ?? "https://infinityoikos.com").trim();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: STRIPE_PRICE_PREMIUM_LISTING, quantity: 1 }],
    success_url: `${frontend}/listings/${listing.id}/edit?premium=success`,
    cancel_url: `${frontend}/listings/${listing.id}/edit?premium=cancelled`,
    client_reference_id: user.id,
    metadata: {
      kind: "premium_listing",
      userId: user.id,
      listingId: listing.id,
      days: String(PREMIUM_LISTING_DAYS)
    }
  });

  return res.json({ url: session.url });
});

// =========================================================
// Coin-System (Phase H4) — Read + Spend Endpoints
// =========================================================

// GET /me/coins — Balance, History, aktive Spends + Tarife fuer die UI.
app.get("/me/coins", async (req, res) => {
  const userId = req.userId!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coinsBalance: true, isEarlyBird: true, role: true }
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const [transactions, activeSpends] = await Promise.all([
    listTransactions(userId, 50),
    listActiveSpends(userId)
  ]);

  return res.json({
    balance: user.coinsBalance,
    isEarlyBird: user.isEarlyBird,
    role: user.role,
    multiplier: user.isEarlyBird ? EARLY_BIRD_MULTIPLIER : 1,
    transactions,
    activeSpends,
    // Tarife fuer Frontend-Anzeige
    earnAmounts: EARN_AMOUNTS,
    spendCosts: SPEND_COSTS,
    earlyBirdLimit: EARLY_BIRD_LIMIT
  });
});

// POST /me/coins/spend — Coins fuer eine Sichtbarkeits-Aktion ausgeben.
//   body: { kind: SPEND_LISTING_HIGHLIGHT | SPEND_PROFILE_BOOST |
//                 SPEND_FEED_BOOST,
//           targetId?: string  (Pflicht bei SPEND_LISTING_HIGHLIGHT,
//                               muss eigenes Listing sein) }
const SpendKindEnum = z.enum([
  "SPEND_LISTING_HIGHLIGHT",
  "SPEND_PROFILE_BOOST",
  "SPEND_FEED_BOOST"
]);

app.post("/me/coins/spend", async (req, res) => {
  const body = z
    .object({
      kind: SpendKindEnum,
      targetId: z.string().min(1).max(40).optional()
    })
    .parse(req.body);

  const userId = req.userId!;
  const kind = body.kind as SpendKind;

  // Listing-Highlight braucht eine eigene Listing-ID — pruefen, ob der
  // User Eigentuemer des Listings ist (sonst koennte jemand fremde Listings
  // mit seinen eigenen Coins highlighten).
  if (kind === "SPEND_LISTING_HIGHLIGHT") {
    if (!body.targetId) {
      return res.status(400).json({
        error: "targetId (Listing-ID) ist Pflicht fuer SPEND_LISTING_HIGHLIGHT"
      });
    }
    const owned = await prisma.listing.findFirst({
      where: { id: body.targetId, ownerId: userId },
      select: { id: true, status: true }
    });
    if (!owned) {
      return res.status(404).json({
        error: "Listing nicht gefunden oder nicht deins."
      });
    }
    if (owned.status !== "ACTIVE") {
      return res.status(400).json({
        error: "Nur ACTIVE-Inserate koennen ge-highlightet werden."
      });
    }
  } else if (body.targetId) {
    // PROFILE_BOOST und FEED_BOOST kennen kein targetId — silently ignorieren,
    // statt einen Fehler zu werfen, fuer maximale Frontend-Toleranz.
  }

  const result = await spend(
    userId,
    kind,
    kind === "SPEND_LISTING_HIGHLIGHT" ? body.targetId ?? null : null
  );

  if (!result.ok) {
    if (result.reason === "insufficient_balance") {
      return res.status(402).json({
        error: "insufficient_coins",
        message: `Du hast ${result.balance} Coins, brauchst aber ${result.cost}.`,
        balance: result.balance,
        cost: result.cost
      });
    }
    if (result.reason === "user_not_found") {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(400).json({ error: "spend failed" });
  }

  return res.json({
    ok: true,
    spent: result.spent,
    newBalance: result.newBalance,
    validUntil: result.validUntil,
    spendId: result.spendId,
    kind
  });
});

// =========================================================
// Verkaufsabwicklung (Phase J2) — SaleProcess-Endpoints
// =========================================================
// Sicherheit: nur eigene Prozesse (sellerId = req.userId) sichtbar
// und mutierbar. Bei Buyer-Sicht spaeter optional eigenen Endpoint
// /me/buying-processes anlegen — V1 fokussiert auf den Verkaeufer.

const SaleStageEnum = z.enum([
  "ANFRAGE_AKZEPTIERT",
  "BESICHTIGUNG",
  "VERHANDLUNG",
  "RESERVIERUNG_LOI",
  "NOTARENTWURF",
  "NOTARTERMIN",
  "BEURKUNDET",
  "AUFLASSUNGSVORMERKUNG",
  "KAUFPREISZAHLUNG",
  "UEBERGABE",
  "EIGENTUMSUMSCHREIBUNG",
  "ABGESCHLOSSEN",
  "ABGEBROCHEN"
]);

const SaleDocKindEnum = z.enum([
  "GRUNDBUCH",
  "ENERGIEAUSWEIS",
  "FLURKARTE",
  "GRUNDRISS",
  "WOHNFLAECHENBERECHNUNG",
  "KAUFVERTRAG_ENTWURF",
  "KAUFVERTRAG_BEURKUNDET",
  "VORFAELLIGKEITSSCHREIBEN",
  "AUFLASSUNGSVORMERKUNG",
  "UEBERGABEPROTOKOLL",
  "TEILUNGSERKLAERUNG",
  "EIGENTUEMERVERSAMMLUNG_PROTOKOLL",
  "MIETVERTRAEGE",
  "MIETAUFSTELLUNG",
  "NEBENKOSTENABRECHNUNG",
  "GRUNDSTEUERBESCHEID",
  "GEBAEUDEVERSICHERUNG",
  "MAKLERVERTRAG",
  "SONSTIGES"
]);

// GET /me/sale-processes — Liste aller eigenen Verkaeufe
//   ?stage=BESICHTIGUNG  -> filtert auf eine Stage
//   ?active=true         -> nur nicht-ABGESCHLOSSEN/ABGEBROCHEN
//   ?listingId=xxx       -> nur Prozesse eines bestimmten Listings
app.get("/me/sale-processes", async (req, res) => {
  const q = z
    .object({
      stage: SaleStageEnum.optional(),
      active: z.coerce.boolean().optional(),
      listingId: z.string().min(1).max(40).optional()
    })
    .parse(req.query);

  const where: Record<string, unknown> = { sellerId: req.userId! };
  if (q.stage) where.currentStage = q.stage;
  if (q.active) {
    where.currentStage = { notIn: ["ABGESCHLOSSEN", "ABGEBROCHEN"] };
  }
  if (q.listingId) where.listingId = q.listingId;

  const processes = await prisma.saleProcess.findMany({
    where: where as never,
    orderBy: [{ updatedAt: "desc" }],
    include: {
      listing: { select: { id: true, title: true, city: true, askingPrice: true } },
      buyer: { select: { id: true, name: true, email: true } },
      _count: { select: { documents: true, stageLog: true } }
    }
  });
  return res.json(processes);
});

// GET /me/sale-processes/:id — Detail mit Documents + Stage-Log
app.get("/me/sale-processes/:id", async (req, res) => {
  const proc = await prisma.saleProcess.findFirst({
    where: { id: req.params.id, sellerId: req.userId! },
    include: {
      listing: true,
      buyer: { select: { id: true, name: true, email: true, role: true } },
      inquiry: { select: { id: true, message: true, createdAt: true } },
      documents: { orderBy: { createdAt: "desc" } },
      stageLog: { orderBy: { createdAt: "desc" }, take: 50 }
    }
  });
  if (!proc) return res.status(404).json({ error: "Not found" });
  return res.json(proc);
});

// POST /me/listings/:listingId/sale-processes — manuell anlegen
//   (z.B. Off-Market-Deal ohne Marketplace-Anfrage).
app.post("/me/listings/:listingId/sale-processes", async (req, res) => {
  const body = z
    .object({
      buyerId: z.string().min(1).max(40).nullable().optional(),
      agreedPrice: z.number().int().min(0).nullable().optional(),
      notes: z.string().max(4000).nullable().optional()
    })
    .parse(req.body ?? {});

  const listing = await prisma.listing.findFirst({
    where: { id: req.params.listingId, ownerId: req.userId! },
    select: { id: true }
  });
  if (!listing) return res.status(404).json({ error: "Listing nicht gefunden oder nicht deins." });

  // Optional: pruefen, ob buyerId existiert
  if (body.buyerId) {
    const exists = await prisma.user.findUnique({
      where: { id: body.buyerId },
      select: { id: true }
    });
    if (!exists) return res.status(400).json({ error: "buyerId existiert nicht" });
  }

  const proc = await prisma.saleProcess.create({
    data: {
      listingId: listing.id,
      sellerId: req.userId!,
      buyerId: body.buyerId ?? null,
      agreedPrice: body.agreedPrice ?? null,
      notes: body.notes ?? null,
      currentStage: "ANFRAGE_AKZEPTIERT",
      stageEnteredAt: new Date()
    }
  });
  await prisma.saleStageEntry.create({
    data: {
      processId: proc.id,
      stage: "ANFRAGE_AKZEPTIERT",
      note: "Manuell angelegt (Off-Market).",
      byUserId: req.userId!
    }
  });

  return res.json(proc);
});

// PATCH /me/sale-processes/:id — generelle Felder aktualisieren
//   (notes, agreedPrice, targetClosingDate, optional buyerId nachtragen)
app.patch("/me/sale-processes/:id", async (req, res) => {
  const body = z
    .object({
      notes: z.string().max(4000).nullable().optional(),
      agreedPrice: z.number().int().min(0).nullable().optional(),
      targetClosingDate: z.string().nullable().optional(),
      buyerId: z.string().min(1).max(40).nullable().optional()
    })
    .parse(req.body);

  const owned = await prisma.saleProcess.findFirst({
    where: { id: req.params.id, sellerId: req.userId! },
    select: { id: true, buyerId: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  if (body.buyerId && body.buyerId !== owned.buyerId) {
    const exists = await prisma.user.findUnique({
      where: { id: body.buyerId },
      select: { id: true }
    });
    if (!exists) return res.status(400).json({ error: "buyerId existiert nicht" });
  }

  const data: Record<string, unknown> = {};
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.agreedPrice !== undefined) data.agreedPrice = body.agreedPrice;
  if (body.targetClosingDate !== undefined) {
    data.targetClosingDate = body.targetClosingDate ? new Date(body.targetClosingDate) : null;
  }
  if (body.buyerId !== undefined) data.buyerId = body.buyerId;

  const updated = await prisma.saleProcess.update({
    where: { id: owned.id },
    data: data as never
  });
  return res.json(updated);
});

// PATCH /me/sale-processes/:id/stage — Stage wechseln + Audit-Log
app.patch("/me/sale-processes/:id/stage", async (req, res) => {
  const body = z
    .object({
      stage: SaleStageEnum,
      note: z.string().max(2000).nullable().optional()
    })
    .parse(req.body);

  const owned = await prisma.saleProcess.findFirst({
    where: { id: req.params.id, sellerId: req.userId! },
    select: { id: true, currentStage: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  // Transaktion: Stage updaten + Audit-Eintrag schreiben
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.saleProcess.update({
      where: { id: owned.id },
      data: { currentStage: body.stage, stageEnteredAt: new Date() }
    });
    await tx.saleStageEntry.create({
      data: {
        processId: owned.id,
        stage: body.stage,
        note: body.note ?? null,
        byUserId: req.userId!
      }
    });
    return u;
  });

  return res.json(updated);
});

// POST /me/sale-processes/:id/documents — Dokument anhaengen oder ersetzen
//   body: { kind, url, filename, sizeBytes }
//   Re-Upload pro (process, kind) ueberschreibt durch upsert.
app.post("/me/sale-processes/:id/documents", async (req, res) => {
  const body = z
    .object({
      kind: SaleDocKindEnum,
      url: z.string().url(),
      filename: z.string().min(1).max(300),
      sizeBytes: z.number().int().min(0)
    })
    .parse(req.body);

  const owned = await prisma.saleProcess.findFirst({
    where: { id: req.params.id, sellerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  const doc = await prisma.saleDocument.upsert({
    where: { processId_kind: { processId: owned.id, kind: body.kind } },
    create: {
      processId: owned.id,
      kind: body.kind,
      url: body.url,
      filename: body.filename,
      sizeBytes: body.sizeBytes,
      uploaderUserId: req.userId!
    },
    update: {
      url: body.url,
      filename: body.filename,
      sizeBytes: body.sizeBytes,
      uploaderUserId: req.userId!
    }
  });
  return res.json(doc);
});

// DELETE /me/sale-processes/:id/documents/:kind — Dokument loeschen
app.delete("/me/sale-processes/:id/documents/:kind", async (req, res) => {
  const kindParse = SaleDocKindEnum.safeParse(req.params.kind);
  if (!kindParse.success) {
    return res.status(400).json({ error: "Unbekannte Dokumenten-Kategorie" });
  }
  const owned = await prisma.saleProcess.findFirst({
    where: { id: req.params.id, sellerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  await prisma.saleDocument.deleteMany({
    where: { processId: owned.id, kind: kindParse.data }
  });
  return res.json({ ok: true });
});

// =========================================================
// Verkaufsabwicklung 2.0 — Token-Freigaben (Phase M1)
// =========================================================
//
// Verkaeufer erzeugt pro Kaufinteressent einen Token-Link. Kaeufer
// oeffnet den Link OHNE Account und sieht nur die freigegebenen
// Dokumenten-Kategorien. Anonymisierung des Listings bleibt erhalten.

/** 256-bit zufaelliger Token, hex-codiert (64 Zeichen). */
function makeAccessToken(): string {
  return randomBytes(32).toString("hex");
}

/** Anonymisierte Listing-Sicht fuer Kaufinteressent (vor Vollfreigabe). */
function listingPublicView(l: {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  city: string;
  postalCode: string | null;
  district: string | null;
  fullAddress: string | null;
  anonymizationLevel: string;
  askingPrice: number;
  totalArea: number;
}) {
  // Spiegel-Logik zu anonymizeListing() aber liefert das pro
  // Verkaeufer freigegebene Bild — Token = vorbereitende
  // Vorab-Information, nicht Voll-Adresszugriff.
  const showFull = l.anonymizationLevel === "FULL_ADDRESS";
  const showDistrict =
    showFull || l.anonymizationLevel === "DISTRICT_ONLY";
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    propertyType: l.propertyType,
    city: l.city,
    postalCode: showFull ? l.postalCode : null,
    district: showDistrict ? l.district : null,
    fullAddress: showFull ? l.fullAddress : null,
    askingPrice: l.askingPrice,
    totalArea: l.totalArea
  };
}

const AllowedDocKindsSchema = z.array(SaleDocKindEnum).min(1).max(20);

// GET /me/buyer-access — alle eigenen Freigaben ueber alle Inserate
// (Phase M4 — globale Verkaeufer-Uebersicht)
//   ?activeOnly=true   -> filtert revoked / expired aus
//   ?limit=20          -> default 100, max 200
app.get("/me/buyer-access", async (req, res) => {
  const q = z
    .object({
      activeOnly: z.coerce.boolean().optional(),
      limit: z.coerce.number().int().min(1).max(200).optional()
    })
    .parse(req.query);
  const items = await prisma.buyerDocAccess.findMany({
    where: {
      sellerId: req.userId!,
      ...(q.activeOnly
        ? {
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
          }
        : {})
    },
    orderBy: [{ createdAt: "desc" }],
    take: q.limit ?? 100,
    include: {
      listing: { select: { id: true, title: true, city: true, district: true } }
    }
  });
  return res.json(items);
});

// GET /me/buyer-access-received — Investor-Sicht: alle Freigaben,
// in denen ich (req.userId) als buyerUserId gebunden bin.
//   Liefert direkt die freigegebenen Dokumente (statt nur Token-Link).
//   Verwendet auch fuer den InvestorEmpfaenger-Dashboard.
app.get("/me/buyer-access-received", async (req, res) => {
  const accesses = await prisma.buyerDocAccess.findMany({
    where: {
      buyerUserId: req.userId!,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          description: true,
          propertyType: true,
          city: true,
          district: true,
          postalCode: true,
          fullAddress: true,
          anonymizationLevel: true,
          askingPrice: true,
          totalArea: true,
          saleProcesses: {
            select: {
              id: true,
              documents: {
                select: {
                  id: true,
                  kind: true,
                  url: true,
                  filename: true,
                  sizeBytes: true,
                  createdAt: true
                }
              }
            },
            orderBy: { updatedAt: "desc" },
            take: 1
          }
        }
      }
    }
  });

  // Dokumente pro Access filtern auf allowedDocKinds
  const enriched = accesses.map((a) => {
    const proc = a.listing.saleProcesses[0] ?? null;
    const allowed = new Set(a.allowedDocKinds);
    const documents = (proc?.documents ?? []).filter((d) => allowed.has(d.kind));
    return {
      id: a.id,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      allowedDocKinds: a.allowedDocKinds,
      expiresAt: a.expiresAt,
      lastAccessedAt: a.lastAccessedAt,
      accessCount: a.accessCount,
      buyerLabel: a.buyerLabel,
      listing: listingPublicView(a.listing),
      documents,
      pipelineExists: !!proc
    };
  });
  return res.json(enriched);
});

// GET /me/listings/:listingId/buyer-access — Freigaben eines eigenen Listings
app.get("/me/listings/:listingId/buyer-access", async (req, res) => {
  const listing = await prisma.listing.findFirst({
    where: { id: req.params.listingId, ownerId: req.userId! },
    select: { id: true }
  });
  if (!listing) return res.status(404).json({ error: "Listing nicht gefunden oder nicht deins." });

  const accesses = await prisma.buyerDocAccess.findMany({
    where: { listingId: listing.id, sellerId: req.userId! },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      buyerLabel: true,
      buyerEmail: true,
      notes: true,
      token: true,
      allowedDocKinds: true,
      expiresAt: true,
      revokedAt: true,
      lastAccessedAt: true,
      accessCount: true,
      inquiryId: true,
      buyerUserId: true
    }
  });
  return res.json(accesses);
});

// POST /me/listings/:listingId/buyer-access — Freigabe erstellen
// Phase M3: wenn inquiryId mitgegeben wird und buyerLabel/buyerEmail fehlen,
// werden die aus dem Investor-Profil der Inquiry abgeleitet.
app.post("/me/listings/:listingId/buyer-access", async (req, res) => {
  const body = z
    .object({
      allowedDocKinds: AllowedDocKindsSchema,
      buyerLabel: z.string().max(200).nullable().optional(),
      buyerEmail: z.string().email().max(200).nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
      inquiryId: z.string().min(1).max(40).nullable().optional(),
      expiresAt: z.string().nullable().optional()
    })
    .parse(req.body ?? {});

  const listing = await prisma.listing.findFirst({
    where: { id: req.params.listingId, ownerId: req.userId! },
    select: { id: true }
  });
  if (!listing) return res.status(404).json({ error: "Listing nicht gefunden oder nicht deins." });

  // optional: Inquiry-Plausibilitaet pruefen + Auto-Fill der Buyer-Daten
  let buyerUserId: string | null = null;
  let autoLabel: string | null = null;
  let autoEmail: string | null = null;
  if (body.inquiryId) {
    const inq = await prisma.inquiry.findFirst({
      where: { id: body.inquiryId, listingId: listing.id },
      select: {
        id: true,
        investorId: true,
        investor: { select: { name: true, email: true } }
      }
    });
    if (!inq) return res.status(400).json({ error: "Inquiry passt nicht zu diesem Listing." });
    buyerUserId = inq.investorId;
    autoLabel = inq.investor?.name ?? null;
    autoEmail = inq.investor?.email ?? null;
  }

  let expiresDate: Date | null = null;
  if (body.expiresAt) {
    const d = new Date(body.expiresAt);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ error: "expiresAt ist kein gueltiges Datum." });
    }
    expiresDate = d;
  }

  const access = await prisma.buyerDocAccess.create({
    data: {
      listingId: listing.id,
      sellerId: req.userId!,
      inquiryId: body.inquiryId ?? null,
      buyerUserId,
      buyerLabel: body.buyerLabel ?? autoLabel ?? null,
      buyerEmail: body.buyerEmail ?? autoEmail ?? null,
      notes: body.notes ?? null,
      token: makeAccessToken(),
      allowedDocKinds: body.allowedDocKinds,
      expiresAt: expiresDate
    }
  });
  return res.json(access);
});

// =========================================================
// Notifications (Phase M3)
// =========================================================

// GET /me/notifications — eigene Notifications
//   ?unreadOnly=true  -> nur ungelesene
//   ?limit=50         -> default 50, max 200
app.get("/me/notifications", async (req, res) => {
  const q = z
    .object({
      unreadOnly: z.coerce.boolean().optional(),
      limit: z.coerce.number().int().min(1).max(200).optional()
    })
    .parse(req.query);
  const limit = q.limit ?? 50;

  const where: Record<string, unknown> = { userId: req.userId! };
  if (q.unreadOnly) where.readAt = null;

  const [items, unreadCount] = await Promise.all([
    prisma.userNotification.findMany({
      where: where as never,
      orderBy: [{ createdAt: "desc" }],
      take: limit
    }),
    prisma.userNotification.count({
      where: { userId: req.userId!, readAt: null }
    })
  ]);
  return res.json({ items, unreadCount });
});

// PATCH /me/notifications/:id — als gelesen markieren (idempotent)
app.patch("/me/notifications/:id", async (req, res) => {
  const owned = await prisma.userNotification.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    select: { id: true, readAt: true }
  });
  if (!owned) return res.status(404).json({ error: "Notification nicht gefunden." });
  const updated = await prisma.userNotification.update({
    where: { id: owned.id },
    data: { readAt: owned.readAt ?? new Date() }
  });
  return res.json(updated);
});

// POST /me/notifications/mark-all-read — alle ungelesenen markieren
app.post("/me/notifications/mark-all-read", async (req, res) => {
  const r = await prisma.userNotification.updateMany({
    where: { userId: req.userId!, readAt: null },
    data: { readAt: new Date() }
  });
  return res.json({ updated: r.count });
});

// PATCH /me/buyer-access/:id — Felder aktualisieren / widerrufen
app.patch("/me/buyer-access/:id", async (req, res) => {
  const body = z
    .object({
      allowedDocKinds: AllowedDocKindsSchema.optional(),
      buyerLabel: z.string().max(200).nullable().optional(),
      buyerEmail: z.string().email().max(200).nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
      expiresAt: z.string().nullable().optional(),
      revoke: z.boolean().optional()
    })
    .parse(req.body ?? {});

  const owned = await prisma.buyerDocAccess.findFirst({
    where: { id: req.params.id, sellerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Freigabe nicht gefunden." });

  const data: Record<string, unknown> = {};
  if (body.allowedDocKinds !== undefined) data.allowedDocKinds = body.allowedDocKinds;
  if (body.buyerLabel !== undefined) data.buyerLabel = body.buyerLabel;
  if (body.buyerEmail !== undefined) data.buyerEmail = body.buyerEmail;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null) {
      data.expiresAt = null;
    } else {
      const d = new Date(body.expiresAt);
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: "expiresAt ist kein gueltiges Datum." });
      }
      data.expiresAt = d;
    }
  }
  if (body.revoke === true) {
    data.revokedAt = new Date();
  } else if (body.revoke === false) {
    data.revokedAt = null;
  }

  const updated = await prisma.buyerDocAccess.update({
    where: { id: owned.id },
    data
  });
  return res.json(updated);
});

// DELETE /me/buyer-access/:id — Freigabe hart entfernen
app.delete("/me/buyer-access/:id", async (req, res) => {
  const owned = await prisma.buyerDocAccess.findFirst({
    where: { id: req.params.id, sellerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Freigabe nicht gefunden." });
  await prisma.buyerDocAccess.delete({ where: { id: owned.id } });
  return res.json({ ok: true });
});

// GET /public/buyer-access/:token — Kaeufer-Sicht, KEIN Auth
// 404 wenn unbekannt, widerrufen oder abgelaufen.
app.get("/public/buyer-access/:token", async (req, res) => {
  const token = String(req.params.token ?? "");
  if (!/^[a-f0-9]{32,128}$/.test(token)) {
    return res.status(404).json({ error: "Nicht gefunden." });
  }
  const access = await prisma.buyerDocAccess.findUnique({
    where: { token },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          description: true,
          propertyType: true,
          city: true,
          postalCode: true,
          district: true,
          fullAddress: true,
          anonymizationLevel: true,
          askingPrice: true,
          totalArea: true,
          saleProcesses: {
            select: {
              id: true,
              currentStage: true,
              documents: {
                select: {
                  id: true,
                  kind: true,
                  url: true,
                  filename: true,
                  sizeBytes: true,
                  createdAt: true
                }
              }
            },
            orderBy: { updatedAt: "desc" },
            take: 1
          }
        }
      }
    }
  });
  if (!access) return res.status(404).json({ error: "Nicht gefunden." });
  if (access.revokedAt) return res.status(404).json({ error: "Freigabe widerrufen." });
  if (access.expiresAt && access.expiresAt.getTime() < Date.now()) {
    return res.status(404).json({ error: "Freigabe abgelaufen." });
  }

  // Audit aktualisieren
  const wasFirstAccess = access.accessCount === 0;
  // Phase M4 — Auto-Bind: wenn ein eingeloggter Investor (Clerk-Token im
  // Authorization-Header) den Public-Link oeffnet und noch kein
  // buyerUserId gesetzt ist, knuepfen wir die Freigabe an ihn. Damit
  // taucht sie ab dem zweiten Mal auch unter /me/buyer-access-received
  // direkt in der App-Shell auf.
  let autoBoundBuyerUserId: string | null = null;
  if (!access.buyerUserId) {
    const authHeader = req.headers.authorization;
    const secret = process.env.CLERK_SECRET_KEY;
    if (authHeader?.startsWith("Bearer ") && secret) {
      try {
        const claims = await verifyToken(authHeader.slice(7), {
          secretKey: secret
        });
        const clerkId = claims?.sub ?? null;
        if (clerkId) {
          const user = await prisma.user.findUnique({
            where: { clerkId },
            select: { id: true }
          });
          if (user) autoBoundBuyerUserId = user.id;
        }
      } catch {
        /* leise — ungueltiges Token wird einfach ignoriert */
      }
    }
  }
  await prisma.buyerDocAccess.update({
    where: { id: access.id },
    data: {
      lastAccessedAt: new Date(),
      accessCount: { increment: 1 },
      ...(autoBoundBuyerUserId ? { buyerUserId: autoBoundBuyerUserId } : {})
    }
  });

  // Phase M3 — Notification an den Verkaeufer (nur beim ersten Abruf).
  // Spaeter koennen weitere Events (z.B. REPEAT_BUYER_ACCESS nach > N Tagen)
  // hier eingebunden werden. Fire-and-forget — ein Fehler beim Notify darf
  // den Public-Endpoint nie blockieren.
  if (wasFirstAccess) {
    try {
      const buyerLabel = access.buyerLabel ?? "Ein Kaufinteressent";
      await prisma.userNotification.create({
        data: {
          userId: access.sellerId,
          kind: "FIRST_BUYER_ACCESS",
          title: `${buyerLabel} hat deine Dokumenten-Freigabe geöffnet`,
          body: `Für „${access.listing.title}" — ${access.allowedDocKinds.length} Kategorie(n) freigegeben.`,
          link: `/listings/${access.listingId}/edit`,
          payloadJson: {
            accessId: access.id,
            listingId: access.listingId,
            listingTitle: access.listing.title,
            buyerLabel: access.buyerLabel,
            buyerEmail: access.buyerEmail,
            allowedDocKinds: access.allowedDocKinds
          }
        }
      });
    } catch {
      /* leise */
    }
  }

  // Dokumente filtern: nur die freigegebenen Kategorien
  const proc = access.listing.saleProcesses[0] ?? null;
  const allowed = new Set(access.allowedDocKinds);
  const documents = (proc?.documents ?? []).filter((d) => allowed.has(d.kind));

  return res.json({
    buyerLabel: access.buyerLabel,
    allowedDocKinds: access.allowedDocKinds,
    expiresAt: access.expiresAt,
    listing: listingPublicView(access.listing),
    documents,
    pipelineExists: !!proc
  });
});

// =========================================================
// KI-Marktanalyse + Angebotsbewertung (Phase K3)
// =========================================================

/** Mapping: Listing-Datensatz aus DB -> ListingMarketInput fuer Claude. */
function listingToMarketInput(l: {
  title: string;
  description: string;
  propertyType: string;
  askingPrice: number;
  totalArea: number;
  totalRent: number | null;
  city: string;
  district: string | null;
  postalCode: string | null;
  yearBuilt: number | null;
  lastRenovation: number | null;
  condition: string | null;
  livingArea: number | null;
  commercialArea: number | null;
  landArea: number | null;
  floors: number | null;
  residentialUnits: number | null;
  commercialUnits: number | null;
  energyClass: string | null;
  energyConsumption: number | null;
  energyCarrier: string | null;
  heatingType: string | null;
  actualRent: number | null;
  vacancyRate: number | null;
  waltMonths: number | null;
  rentIndexed: boolean | null;
  rentEscalation: boolean | null;
  modernizationBacklog: number | null;
  gegCompliant: boolean | null;
  commissionRate: number | null;
  commissionFree: boolean | null;
  features: string[];
  highlights: string[];
  tenantSectors: string[];
  anchorTenant: string | null;
}): ListingMarketInput {
  return {
    title: l.title,
    description: l.description,
    propertyType: l.propertyType,
    askingPrice: l.askingPrice,
    totalArea: l.totalArea,
    totalRent: l.totalRent,
    city: l.city,
    district: l.district,
    postalCode: l.postalCode,
    yearBuilt: l.yearBuilt,
    lastRenovation: l.lastRenovation,
    condition: l.condition,
    livingArea: l.livingArea,
    commercialArea: l.commercialArea,
    landArea: l.landArea,
    floors: l.floors,
    residentialUnits: l.residentialUnits,
    commercialUnits: l.commercialUnits,
    energyClass: l.energyClass,
    energyConsumption: l.energyConsumption,
    energyCarrier: l.energyCarrier,
    heatingType: l.heatingType,
    actualRent: l.actualRent,
    vacancyRate: l.vacancyRate,
    waltMonths: l.waltMonths,
    rentIndexed: l.rentIndexed,
    rentEscalation: l.rentEscalation,
    modernizationBacklog: l.modernizationBacklog,
    gegCompliant: l.gegCompliant,
    commissionRate: l.commissionRate,
    commissionFree: l.commissionFree,
    features: l.features ?? [],
    highlights: l.highlights ?? [],
    tenantSectors: l.tenantSectors ?? [],
    anchorTenant: l.anchorTenant
  };
}

// GET /me/listings/:id/market-analysis — letzte gespeicherte Analyse
app.get("/me/listings/:id/market-analysis", async (req, res) => {
  const listing = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    select: { id: true }
  });
  if (!listing) return res.status(404).json({ error: "Not found" });

  const analysis = await prisma.marketAnalysis.findUnique({
    where: { listingId: listing.id }
  });
  if (!analysis) return res.status(404).json({ error: "Noch keine Analyse" });
  return res.json(analysis);
});

// POST /me/listings/:id/market-analysis — neue Analyse erzeugen (Upsert).
//   ?force=true ueberschreibt eine kuerzlich erzeugte Analyse trotzdem.
//   Sonst: wenn juenger als 1 Stunde -> cached zurueckgeben.
app.post("/me/listings/:id/market-analysis", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY nicht konfiguriert." });
  }
  const force = String(req.query.force ?? "") === "true";

  const listing = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!listing) return res.status(404).json({ error: "Listing nicht gefunden" });

  // Cache-Check: 1h Schutz vor versehentlichen Re-Runs
  if (!force) {
    const existing = await prisma.marketAnalysis.findUnique({
      where: { listingId: listing.id }
    });
    if (existing && Date.now() - existing.updatedAt.getTime() < 60 * 60 * 1000) {
      return res.json({ ...existing, cached: true });
    }
  }

  let result;
  try {
    result = await analyzeListingMarket(listingToMarketInput(listing as never));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return res.status(502).json({ error: `KI-Aufruf fehlgeschlagen: ${msg}` });
  }

  const saved = await prisma.marketAnalysis.upsert({
    where: { listingId: listing.id },
    create: {
      listingId: listing.id,
      priceConservative: result.priceConservative,
      priceFair: result.priceFair,
      pricePremium: result.pricePremium,
      salesSpeed: result.salesSpeed,
      demand: result.demand,
      buyerSegments: result.buyerSegments,
      recommendedAskingPrice: result.recommendedAskingPrice,
      negotiationRange: result.negotiationRange,
      marketingStrategy: result.marketingStrategy,
      risks: result.risks,
      summary: result.summary,
      rawJson: result.rawJson as never,
      model: result.model
    },
    update: {
      priceConservative: result.priceConservative,
      priceFair: result.priceFair,
      pricePremium: result.pricePremium,
      salesSpeed: result.salesSpeed,
      demand: result.demand,
      buyerSegments: result.buyerSegments,
      recommendedAskingPrice: result.recommendedAskingPrice,
      negotiationRange: result.negotiationRange,
      marketingStrategy: result.marketingStrategy,
      risks: result.risks,
      summary: result.summary,
      rawJson: result.rawJson as never,
      model: result.model
    }
  });

  return res.json({ ...saved, cached: false });
});

// DELETE /me/listings/:id/market-analysis — Reset (z.B. nach Listing-Edit)
app.delete("/me/listings/:id/market-analysis", async (req, res) => {
  const listing = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    select: { id: true }
  });
  if (!listing) return res.status(404).json({ error: "Not found" });
  await prisma.marketAnalysis.deleteMany({ where: { listingId: listing.id } });
  return res.json({ ok: true });
});

// GET /me/listings/:id/offer-evals — History aller Bewertungen (max 50)
app.get("/me/listings/:id/offer-evals", async (req, res) => {
  const listing = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    select: { id: true }
  });
  if (!listing) return res.status(404).json({ error: "Not found" });

  const items = await prisma.offerEvaluation.findMany({
    where: { listingId: listing.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return res.json(items);
});

// POST /me/listings/:id/offer-evals — neues Angebot bewerten lassen
//   body: { offerAmount, offerNote?, inquiryId? }
app.post("/me/listings/:id/offer-evals", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY nicht konfiguriert." });
  }
  const body = z
    .object({
      offerAmount: z.number().int().min(1),
      offerNote: z.string().max(2000).nullable().optional(),
      inquiryId: z.string().min(1).max(40).nullable().optional()
    })
    .parse(req.body);

  const listing = await prisma.listing.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!listing) return res.status(404).json({ error: "Listing nicht gefunden" });

  // Optional: bestehende MarketAnalysis als Kontext fuer Claude
  const existing = await prisma.marketAnalysis.findUnique({
    where: { listingId: listing.id },
    select: {
      priceConservative: true,
      priceFair: true,
      pricePremium: true,
      recommendedAskingPrice: true
    }
  });

  // Optional: Inquiry-ID nur akzeptieren, wenn sie zum Listing gehoert
  let validInquiryId: string | null = null;
  if (body.inquiryId) {
    const inq = await prisma.inquiry.findFirst({
      where: { id: body.inquiryId, listingId: listing.id },
      select: { id: true }
    });
    validInquiryId = inq?.id ?? null;
  }

  let result;
  try {
    result = await evaluateBuyerOffer({
      listing: listingToMarketInput(listing as never),
      offerAmount: body.offerAmount,
      offerNote: body.offerNote ?? null,
      existingAnalysis:
        existing &&
        existing.priceConservative != null &&
        existing.priceFair != null &&
        existing.pricePremium != null &&
        existing.recommendedAskingPrice != null
          ? {
              priceConservative: existing.priceConservative,
              priceFair: existing.priceFair,
              pricePremium: existing.pricePremium,
              recommendedAskingPrice: existing.recommendedAskingPrice
            }
          : null
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return res.status(502).json({ error: `KI-Aufruf fehlgeschlagen: ${msg}` });
  }

  const saved = await prisma.offerEvaluation.create({
    data: {
      listingId: listing.id,
      inquiryId: validInquiryId,
      offerAmount: body.offerAmount,
      offerNote: body.offerNote ?? null,
      attractiveness: result.attractiveness,
      successProbability: result.successProbability,
      recommendation: result.recommendation,
      counterOffer: result.counterOffer ?? null,
      negotiationHints: result.negotiationHints,
      strategicAdvice: result.strategicAdvice,
      rawJson: result.rawJson as never,
      model: result.model
    }
  });

  return res.json(saved);
});

// =========================================================
// Vermietungsplattform (Phase L3) — RentalUnit, RentalApplication
// und KI-Bewerber-Bewertung. Alle ownership-gefiltert.
// =========================================================

const RentalStatusEnum = z.enum([
  "DRAFT",
  "AVAILABLE",
  "RESERVED",
  "RENTED",
  "ARCHIVED"
]);

const ApplicationStatusEnum = z.enum([
  "NEW",
  "REVIEWING",
  "VIEWING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN"
]);

// ----- RentalUnit Zod-Schemas -----

const RentalUnitCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(8000).optional(),
  city: z.string().min(1).max(120),
  district: z.string().max(120).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  fullAddress: z.string().max(300).nullable().optional(),
  rooms: z.number().min(0.5).max(50),
  livingArea: z.number().min(1).max(10000),
  floor: z.string().max(50).nullable().optional(),
  rentCold: z.number().int().min(0),
  utilities: z.number().int().min(0).nullable().optional(),
  totalRent: z.number().int().min(0).nullable().optional(),
  deposit: z.number().int().min(0).nullable().optional(),
  energyClass: EnergyClassEnum.nullable().optional(),
  energyConsumption: z.number().min(0).nullable().optional(),
  energyCarrier: EnergyCarrierEnum.nullable().optional(),
  heatingType: z.string().max(100).nullable().optional(),
  status: RentalStatusEnum.optional(),
  availableFrom: z.string().nullable().optional(),
  fixedTerm: z.boolean().optional(),
  fixedTermMonths: z.number().int().min(1).max(360).nullable().optional(),
  features: z.array(z.string().min(1).max(80)).max(40).optional(),

  // Phase L5.1 — erweiterte Felder
  yearBuilt: z.number().int().min(1800).max(2100).nullable().optional(),
  lastRenovation: z.number().int().min(1800).max(2100).nullable().optional(),
  totalUnits: z.number().int().min(1).max(2000).nullable().optional(),
  bathrooms: z.number().int().min(0).max(20).nullable().optional(),
  separateGuestWc: z.boolean().optional(),
  balcony: z.boolean().optional(),
  balconyArea: z.number().min(0).max(500).nullable().optional(),
  terrace: z.boolean().optional(),
  terraceArea: z.number().min(0).max(500).nullable().optional(),
  garden: z.boolean().optional(),
  gardenShared: z.boolean().optional(),
  cellar: z.boolean().optional(),
  attic: z.boolean().optional(),
  elevator: z.boolean().optional(),
  barrierFree: z.boolean().optional(),
  furnished: z.boolean().optional(),
  partlyFurnished: z.boolean().optional(),
  kitchenIncluded: z.boolean().optional(),
  kitchenBuyOut: z.number().int().min(0).max(100000).nullable().optional(),
  parkingType: z.string().max(20).nullable().optional(),
  parkingCost: z.number().int().min(0).max(2000).nullable().optional(),
  petsAllowed: z.boolean().nullable().optional(),
  petsNote: z.string().max(300).nullable().optional(),
  internetAvailable: z.boolean().nullable().optional(),
  internetSpeed: z.string().max(80).nullable().optional(),
  minRentDurationMonths: z.number().int().min(0).max(360).nullable().optional(),
  depositMonths: z.number().min(0).max(6).nullable().optional(),
  conditions: z.string().max(2000).nullable().optional()
});

const RentalUnitPatchSchema = RentalUnitCreateSchema.partial();

// ----- Application Zod-Schemas -----

const RentalApplicationCreateSchema = z.object({
  applicantName: z.string().min(1).max(200),
  email: z.string().email().max(200).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  monthlyNetIncome: z.number().int().min(0).nullable().optional(),
  employmentType: z.string().max(120).nullable().optional(),
  employmentDuration: z.string().max(120).nullable().optional(),
  schufaScore: z.string().max(60).nullable().optional(),
  householdSize: z.number().int().min(1).max(20).nullable().optional(),
  hasPets: z.boolean().optional(),
  petDetails: z.string().max(300).nullable().optional(),
  smoker: z.boolean().optional(),
  desiredMoveInDate: z.string().nullable().optional(),
  intendedDuration: z.string().max(200).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  status: ApplicationStatusEnum.optional()
});

const RentalApplicationPatchSchema = RentalApplicationCreateSchema.partial();

// ----- Helpers -----

function rentalUnitToInput(u: {
  title: string;
  description: string;
  city: string;
  district: string | null;
  rooms: number;
  livingArea: number;
  rentCold: number;
  utilities: number | null;
  totalRent: number | null;
  deposit: number | null;
  features: string[];
  fixedTerm: boolean;
  fixedTermMonths: number | null;
}): RentalUnitInput {
  return {
    title: u.title,
    description: u.description,
    city: u.city,
    district: u.district,
    rooms: u.rooms,
    livingArea: u.livingArea,
    rentCold: u.rentCold,
    utilities: u.utilities,
    totalRent: u.totalRent,
    deposit: u.deposit,
    features: u.features ?? [],
    fixedTerm: u.fixedTerm,
    fixedTermMonths: u.fixedTermMonths
  };
}

function rentalApplicationToInput(a: {
  applicantName: string;
  monthlyNetIncome: number | null;
  employmentType: string | null;
  employmentDuration: string | null;
  schufaScore: string | null;
  householdSize: number | null;
  hasPets: boolean;
  petDetails: string | null;
  smoker: boolean;
  desiredMoveInDate: Date | null;
  intendedDuration: string | null;
  notes: string | null;
}): RentalApplicantInput {
  return {
    applicantName: a.applicantName,
    monthlyNetIncome: a.monthlyNetIncome,
    employmentType: a.employmentType,
    employmentDuration: a.employmentDuration,
    schufaScore: a.schufaScore,
    householdSize: a.householdSize,
    hasPets: a.hasPets,
    petDetails: a.petDetails,
    smoker: a.smoker,
    desiredMoveInDate: a.desiredMoveInDate
      ? a.desiredMoveInDate.toISOString().slice(0, 10)
      : null,
    intendedDuration: a.intendedDuration,
    notes: a.notes
  };
}

// =========================================================
// RentalUnit-Endpoints
// =========================================================

// GET /me/rental-units — Liste eigener Mietobjekte
app.get("/me/rental-units", async (req, res) => {
  const q = z
    .object({ status: RentalStatusEnum.optional() })
    .parse(req.query);
  const units = await prisma.rentalUnit.findMany({
    where: {
      ownerId: req.userId!,
      ...(q.status ? { status: q.status } : {})
    },
    orderBy: { updatedAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { applications: true } }
    }
  });
  return res.json(units);
});

// POST /me/rental-units — neues Mietobjekt (DRAFT)
app.post("/me/rental-units", async (req, res) => {
  const body = RentalUnitCreateSchema.parse(req.body);
  const { availableFrom, features, ...rest } = body;
  const unit = await prisma.rentalUnit.create({
    data: {
      ownerId: req.userId!,
      ...rest,
      description: rest.description ?? "",
      availableFrom: availableFrom ? new Date(availableFrom) : null,
      features: features ?? [],
      status: rest.status ?? "DRAFT"
    } as never,
    include: { images: { orderBy: { sortOrder: "asc" } } }
  });
  return res.json(unit);
});

// GET /me/rental-units/:id — Detail
app.get("/me/rental-units/:id", async (req, res) => {
  const unit = await prisma.rentalUnit.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    include: {
      images: { orderBy: { sortOrder: "asc" } }
    }
  });
  if (!unit) return res.status(404).json({ error: "Not found" });
  return res.json(unit);
});

// PATCH /me/rental-units/:id — Felder updaten
app.patch("/me/rental-units/:id", async (req, res) => {
  const body = RentalUnitPatchSchema.parse(req.body);
  const owned = await prisma.rentalUnit.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  const { availableFrom, ...rest } = body;
  const data: Record<string, unknown> = { ...rest };
  if (availableFrom !== undefined) {
    data.availableFrom = availableFrom ? new Date(availableFrom) : null;
  }
  const updated = await prisma.rentalUnit.update({
    where: { id: owned.id },
    data: data as never,
    include: { images: { orderBy: { sortOrder: "asc" } } }
  });
  return res.json(updated);
});

// DELETE /me/rental-units/:id
app.delete("/me/rental-units/:id", async (req, res) => {
  const owned = await prisma.rentalUnit.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });
  await prisma.rentalUnit.delete({ where: { id: owned.id } });
  return res.json({ ok: true });
});

// POST /me/rental-units/:id/images — Bild registrieren (URL kommt vom Frontend-Upload)
app.post("/me/rental-units/:id/images", async (req, res) => {
  const body = z
    .object({
      url: z.string().url(),
      alt: z.string().max(200).nullable().optional(),
      sortOrder: z.number().int().min(0).max(1000).optional()
    })
    .parse(req.body);

  const owned = await prisma.rentalUnit.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  const img = await prisma.rentalUnitImage.create({
    data: {
      unitId: owned.id,
      url: body.url,
      alt: body.alt ?? null,
      sortOrder: body.sortOrder ?? 0
    }
  });
  return res.json(img);
});

// DELETE /me/rental-units/:unitId/images/:imageId
app.delete("/me/rental-units/:unitId/images/:imageId", async (req, res) => {
  const owned = await prisma.rentalUnit.findFirst({
    where: { id: req.params.unitId, ownerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });
  await prisma.rentalUnitImage.deleteMany({
    where: { id: req.params.imageId, unitId: owned.id }
  });
  return res.json({ ok: true });
});

// =========================================================
// RentalApplication-Endpoints
// =========================================================

// GET /me/rental-units/:unitId/applications — alle Bewerber fuer ein Objekt
app.get("/me/rental-units/:unitId/applications", async (req, res) => {
  const owned = await prisma.rentalUnit.findFirst({
    where: { id: req.params.unitId, ownerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  const apps = await prisma.rentalApplication.findMany({
    where: { unitId: owned.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      evaluations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          createdAt: true,
          rating: true,
          recommendViewing: true,
          summary: true
        }
      }
    }
  });
  return res.json(apps);
});

// POST /me/rental-units/:unitId/applications — neuen Bewerber anlegen
app.post("/me/rental-units/:unitId/applications", async (req, res) => {
  const body = RentalApplicationCreateSchema.parse(req.body);
  const owned = await prisma.rentalUnit.findFirst({
    where: { id: req.params.unitId, ownerId: req.userId! },
    select: { id: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  const { desiredMoveInDate, ...rest } = body;
  const app2 = await prisma.rentalApplication.create({
    data: {
      unitId: owned.id,
      ...rest,
      desiredMoveInDate: desiredMoveInDate ? new Date(desiredMoveInDate) : null,
      status: rest.status ?? "NEW"
    } as never
  });
  return res.json(app2);
});

// Helper: ist die Application im Besitz des aktuellen Users?
async function ownedApplication(applicationId: string, userId: string) {
  return prisma.rentalApplication.findFirst({
    where: { id: applicationId, unit: { ownerId: userId } },
    include: { unit: true, evaluations: { orderBy: { createdAt: "desc" } } }
  });
}

// GET /me/rental-applications/:id — Detail mit Evaluations-History
app.get("/me/rental-applications/:id", async (req, res) => {
  const app2 = await ownedApplication(req.params.id, req.userId!);
  if (!app2) return res.status(404).json({ error: "Not found" });
  return res.json(app2);
});

// PATCH /me/rental-applications/:id
app.patch("/me/rental-applications/:id", async (req, res) => {
  const body = RentalApplicationPatchSchema.parse(req.body);
  const owned = await ownedApplication(req.params.id, req.userId!);
  if (!owned) return res.status(404).json({ error: "Not found" });

  const { desiredMoveInDate, ...rest } = body;
  const data: Record<string, unknown> = { ...rest };
  if (desiredMoveInDate !== undefined) {
    data.desiredMoveInDate = desiredMoveInDate ? new Date(desiredMoveInDate) : null;
  }
  const updated = await prisma.rentalApplication.update({
    where: { id: owned.id },
    data: data as never
  });
  return res.json(updated);
});

// DELETE /me/rental-applications/:id
app.delete("/me/rental-applications/:id", async (req, res) => {
  const owned = await ownedApplication(req.params.id, req.userId!);
  if (!owned) return res.status(404).json({ error: "Not found" });
  await prisma.rentalApplication.delete({ where: { id: owned.id } });
  return res.json({ ok: true });
});

// =========================================================
// KI-Bewertung
// =========================================================

// POST /me/rental-applications/:id/evaluate — Claude-Bewertung anstossen
app.post("/me/rental-applications/:id/evaluate", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY nicht konfiguriert." });
  }

  const owned = await prisma.rentalApplication.findFirst({
    where: { id: req.params.id, unit: { ownerId: req.userId! } },
    include: { unit: true }
  });
  if (!owned) return res.status(404).json({ error: "Not found" });

  let result;
  try {
    result = await evaluateRentalApplicant({
      unit: rentalUnitToInput(owned.unit as never),
      applicant: rentalApplicationToInput(owned as never)
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    return res.status(502).json({ error: `KI-Aufruf fehlgeschlagen: ${msg}` });
  }

  const saved = await prisma.applicantEvaluation.create({
    data: {
      applicationId: owned.id,
      rating: result.rating,
      summary: result.summary,
      strengths: result.strengths,
      risks: result.risks,
      openQuestions: result.openQuestions,
      financialStability: result.financialStability,
      sizeFit: result.sizeFit,
      expectedDuration: result.expectedDuration,
      reliability: result.reliability,
      communication: result.communication,
      recommendViewing: result.recommendViewing,
      requestDocuments: result.requestDocuments ?? null,
      suggestFollowUp: result.suggestFollowUp ?? null,
      rationale: result.rationale,
      rawJson: result.rawJson as never,
      model: result.model
    }
  });
  return res.json(saved);
});

// GET /me/rental-applications/:id/evaluations — History
app.get("/me/rental-applications/:id/evaluations", async (req, res) => {
  const owned = await ownedApplication(req.params.id, req.userId!);
  if (!owned) return res.status(404).json({ error: "Not found" });
  const items = await prisma.applicantEvaluation.findMany({
    where: { applicationId: owned.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  return res.json(items);
});

// =========================================================
// Oeffentliche Mietboerse (Phase L6)
// Nur AVAILABLE-Mietobjekte. fullAddress wird nicht ausgespielt
// (Vermieter-Privatsphaere). Bewerber sieht Stadt, Stadtteil, PLZ.
// =========================================================

function anonymizeRentalUnit<T extends { fullAddress?: string | null }>(u: T) {
  // fullAddress raus — wird nur dem Vermieter selbst gezeigt.
  const { fullAddress: _ignore, ...rest } = u as T & { fullAddress?: string | null };
  return rest;
}

// GET /rental-marketplace — alle aktuell vermietbaren Objekte
app.get("/rental-marketplace", async (req, res) => {
  const q = z
    .object({
      city: z.string().optional(),
      roomsMin: z.coerce.number().min(0).optional(),
      rentMax: z.coerce.number().int().min(0).optional(),
      areaMin: z.coerce.number().min(0).optional(),
      furnished: z.coerce.boolean().optional(),
      petsAllowed: z.coerce.boolean().optional(),
      barrierFree: z.coerce.boolean().optional()
    })
    .parse(req.query);

  const where: Record<string, unknown> = { status: "AVAILABLE" };
  if (q.city) where.city = { contains: q.city, mode: "insensitive" as const };
  if (q.roomsMin != null) where.rooms = { gte: q.roomsMin };
  if (q.rentMax != null) where.rentCold = { lte: q.rentMax };
  if (q.areaMin != null) where.livingArea = { gte: q.areaMin };
  if (q.furnished) where.furnished = true;
  if (q.petsAllowed) where.petsAllowed = true;
  if (q.barrierFree) where.barrierFree = true;

  const units = await prisma.rentalUnit.findMany({
    where: where as never,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 5 },
      owner: { select: { id: true, name: true } }
    }
  });
  const anonymized = units.map(anonymizeRentalUnit);
  return res.json(anonymized);
});

// GET /rental-marketplace/:id — Detail einer Mietboersen-Position
//   Inkl. "myApplication", falls der eingeloggte User schon beworben ist.
app.get("/rental-marketplace/:id", async (req, res) => {
  const unit = await prisma.rentalUnit.findFirst({
    where: { id: req.params.id, status: "AVAILABLE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, name: true } }
    }
  });
  if (!unit) return res.status(404).json({ error: "Not found" });

  const myApplication = await prisma.rentalApplication.findFirst({
    where: { unitId: unit.id, applicantUserId: req.userId! },
    select: { id: true, status: true, createdAt: true }
  });

  return res.json({ ...anonymizeRentalUnit(unit), myApplication });
});

// POST /rental-marketplace/:unitId/apply — der eingeloggte User bewirbt
//   sich selbst (Selbstbewerbungs-Form). Body siehe Schema unten.
//
// Der Vermieter sieht die neue Bewerbung in seinem /rentals/:unitId-Tab
// und kann KI-Bewertung anfordern.
//
// Anti-Doppel-Bewerbung: pro (unit, applicantUserId) nur eine aktive
// Bewerbung. Status-Reset auf NEW bei erneuter Submission, damit
// Vermieter es noch sieht.
const RentalApplyBodySchema = z.object({
  applicantName: z.string().min(1).max(200),
  email: z.string().email().max(200).nullable().optional(),
  phone: z.string().max(60).nullable().optional(),
  monthlyNetIncome: z.number().int().min(0).max(1000000).nullable().optional(),
  employmentType: z.string().max(120).nullable().optional(),
  employmentDuration: z.string().max(120).nullable().optional(),
  schufaScore: z.string().max(60).nullable().optional(),
  householdSize: z.number().int().min(1).max(20).nullable().optional(),
  hasPets: z.boolean().optional(),
  petDetails: z.string().max(300).nullable().optional(),
  smoker: z.boolean().optional(),
  desiredMoveInDate: z.string().nullable().optional(),
  intendedDuration: z.string().max(200).nullable().optional(),
  notes: z.string().max(4000).nullable().optional()
});

app.post("/rental-marketplace/:unitId/apply", async (req, res) => {
  const body = RentalApplyBodySchema.parse(req.body);

  const unit = await prisma.rentalUnit.findFirst({
    where: { id: req.params.unitId, status: "AVAILABLE" },
    select: { id: true, ownerId: true }
  });
  if (!unit) return res.status(404).json({ error: "Mietobjekt nicht verfügbar" });

  // Self-bewerbung blockieren (Vermieter darf sich nicht selbst bewerben)
  if (unit.ownerId === req.userId!) {
    return res
      .status(400)
      .json({ error: "Du kannst dich nicht auf dein eigenes Mietobjekt bewerben." });
  }

  const existing = await prisma.rentalApplication.findFirst({
    where: {
      unitId: unit.id,
      applicantUserId: req.userId!
    }
  });

  const { desiredMoveInDate, ...rest } = body;
  const data: Record<string, unknown> = {
    ...rest,
    desiredMoveInDate: desiredMoveInDate ? new Date(desiredMoveInDate) : null,
    applicantUserId: req.userId!
  };

  let saved;
  if (existing) {
    // Re-Submit: Daten aktualisieren, Status zurueck auf NEW
    saved = await prisma.rentalApplication.update({
      where: { id: existing.id },
      data: { ...data, status: "NEW" } as never
    });
  } else {
    saved = await prisma.rentalApplication.create({
      data: { ...data, unitId: unit.id, status: "NEW" } as never
    });
  }
  return res.json(saved);
});

// GET /me/applications-sent — eigene gestellte Bewerbungen
app.get("/me/applications-sent", async (req, res) => {
  const apps = await prisma.rentalApplication.findMany({
    where: { applicantUserId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      unit: {
        select: {
          id: true,
          title: true,
          city: true,
          district: true,
          rooms: true,
          livingArea: true,
          rentCold: true,
          status: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true }
          }
        }
      }
    }
  });
  return res.json(apps);
});

// =========================================================
// Stripe Event-Handler — wird von Webhook-Route aufgerufen
// =========================================================
async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = (session.metadata?.userId ?? session.client_reference_id) as string | null;
      if (!userId) return;

      // ----- Premium-Listing (one-off, mode=payment) -----
      if (session.mode === "payment" && session.metadata?.kind === "premium_listing") {
        const listingId = session.metadata?.listingId;
        const days = Number(session.metadata?.days ?? PREMIUM_LISTING_DAYS);
        if (!listingId) return;
        const owned = await prisma.listing.findFirst({
          where: { id: listingId, ownerId: userId }
        });
        if (!owned) return;
        // Verlängert ein bestehendes Featured um weitere n Tage, sonst startet neu ab jetzt.
        const baseline =
          owned.featuredUntil && owned.featuredUntil.getTime() > Date.now()
            ? owned.featuredUntil
            : new Date();
        const next = new Date(baseline.getTime() + days * 24 * 60 * 60 * 1000);
        await prisma.listing.update({
          where: { id: listingId },
          data: { featuredUntil: next }
        });
        return;
      }

      // ----- Subscription-Checkout (mode=subscription) -----
      if (session.mode !== "subscription" || !session.subscription) return;

      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;
      const sub = await stripe!.subscriptions.retrieve(subscriptionId);
      const item = sub.items.data[0];
      const priceId = item?.price.id ?? "";
      const plan = planFromPriceId(priceId);
      if (!plan) return;

      // Stripe-Subscription liefert period_end auf dem Item, nicht auf sub direkt
      const periodEnd = ((item as unknown) as { current_period_end?: number } | undefined)?.current_period_end;
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan,
          stripeSubscriptionId: sub.id,
          planValidUntil: periodEnd ? new Date(periodEnd * 1000) : null
        }
      });
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata?.userId ?? null) as string | null;
      if (!userId) return;

      // Wenn Subscription cancelled (cancelled_at gesetzt + status canceled): Plan zurück
      if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
        await prisma.user.update({
          where: { id: userId },
          data: { plan: "FREE", stripeSubscriptionId: null }
        });
        return;
      }

      const item = sub.items.data[0];
      const priceId = item?.price.id ?? "";
      const plan = planFromPriceId(priceId);
      if (!plan) return;

      const periodEnd = ((item as unknown) as { current_period_end?: number } | undefined)?.current_period_end;
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan,
          stripeSubscriptionId: sub.id,
          planValidUntil: periodEnd ? new Date(periodEnd * 1000) : null
        }
      });
      return;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = (sub.metadata?.userId ?? null) as string | null;
      if (!userId) return;
      await prisma.user.update({
        where: { id: userId },
        data: { plan: "FREE", stripeSubscriptionId: null }
      });
      return;
    }

    default:
      // andere Events ignorieren — wir hören nur auf das Wesentliche
      return;
  }
}

// =========================================================
// Coin-Admin (Phase H8) — Dashboard-Endpoints
// =========================================================
// Alle Routes prueft eine Inline-Middleware via User.isAdmin. Das Flag
// wird manuell per SQL gesetzt (siehe deploy/42_coin-system-h8-admin.bat).
// Bewusst keine Cascade-Aktion: Nicht-Admins bekommen 403 statt 404, damit
// das Verhalten klar ist.

async function ensureAdmin(req: express.Request, res: express.Response): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { isAdmin: true }
  });
  if (!u?.isAdmin) {
    res.status(403).json({ error: "Admin only" });
    return false;
  }
  return true;
}

// GET /admin/coins/overview — Aggregate (Top-10, Sums per Kind, Counts)
app.get("/admin/coins/overview", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;

  const [
    totalUsers,
    earlyBirdsActive,
    sumBalance,
    topEarners,
    topSpenders,
    sumsByKind,
    activeSpendsCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isEarlyBird: true } }),
    prisma.user.aggregate({ _sum: { coinsBalance: true } }),
    prisma.user.findMany({
      orderBy: { coinsBalance: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        coinsBalance: true,
        isEarlyBird: true
      }
    }),
    prisma.coinTransaction.groupBy({
      by: ["userId"],
      where: { amount: { lt: 0 } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "asc" } },
      take: 10
    }),
    prisma.coinTransaction.groupBy({
      by: ["kind"],
      _sum: { amount: true },
      _count: { _all: true }
    }),
    prisma.coinSpend.count({ where: { validUntil: { gt: new Date() } } })
  ]);

  // userIds aus topSpenders aufloesen (groupBy gibt nur userIds)
  const spenderIds = topSpenders.map((s) => s.userId);
  const spenderUsers = spenderIds.length
    ? await prisma.user.findMany({
        where: { id: { in: spenderIds } },
        select: { id: true, name: true, email: true, role: true, coinsBalance: true }
      })
    : [];
  const spenderMap = new Map(spenderUsers.map((u) => [u.id, u]));
  const topSpendersEnriched = topSpenders.map((s) => ({
    user: spenderMap.get(s.userId) ?? null,
    spent: Math.abs(s._sum.amount ?? 0)
  }));

  return res.json({
    totalUsers,
    earlyBirdsActive,
    earlyBirdLimit: EARLY_BIRD_LIMIT,
    coinsInCirculation: sumBalance._sum.coinsBalance ?? 0,
    avgBalance: totalUsers > 0
      ? Math.round((sumBalance._sum.coinsBalance ?? 0) / totalUsers)
      : 0,
    activeSpendsCount,
    topEarners,
    topSpenders: topSpendersEnriched,
    sumsByKind: sumsByKind.map((row) => ({
      kind: row.kind,
      total: row._sum.amount ?? 0,
      count: row._count._all
    }))
  });
});

// GET /admin/coins/transactions — Filterbar (userId, kind, from, to)
app.get("/admin/coins/transactions", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;

  const q = z
    .object({
      userId: z.string().optional(),
      kind: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100)
    })
    .parse(req.query);

  const where: Record<string, unknown> = {};
  if (q.userId) where.userId = q.userId;
  if (q.kind) where.kind = q.kind;
  if (q.from || q.to) {
    const range: Record<string, Date> = {};
    if (q.from) range.gte = new Date(q.from);
    if (q.to) range.lte = new Date(q.to);
    where.createdAt = range;
  }

  const transactions = await prisma.coinTransaction.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: q.limit,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }
    }
  });
  return res.json({ transactions, limit: q.limit });
});

// GET /admin/coins/active-spends — Liste aller laufenden Spends
app.get("/admin/coins/active-spends", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;

  const spends = await prisma.coinSpend.findMany({
    where: { validUntil: { gt: new Date() } },
    orderBy: { validUntil: "asc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  // Bei LISTING_HIGHLIGHT: Listing-Title nachladen (best effort)
  const listingIds = Array.from(
    new Set(
      spends
        .filter((s) => s.kind === "SPEND_LISTING_HIGHLIGHT" && s.targetId)
        .map((s) => s.targetId as string)
    )
  );
  const listings = listingIds.length
    ? await prisma.listing.findMany({
        where: { id: { in: listingIds } },
        select: { id: true, title: true, city: true }
      })
    : [];
  const listingMap = new Map(listings.map((l) => [l.id, l]));

  const enriched = spends.map((s) => ({
    ...s,
    listing:
      s.kind === "SPEND_LISTING_HIGHLIGHT" && s.targetId
        ? listingMap.get(s.targetId) ?? null
        : null
  }));
  return res.json(enriched);
});

// POST /admin/coins/adjust — Manuelle Korrektur (kind = ADMIN_ADJUSTMENT)
//   body: { userId, amount (signed int), note }
//   refId wird mit Timestamp erzeugt -> jeder Aufruf ist eine separate Buchung.
app.post("/admin/coins/adjust", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;

  const body = z
    .object({
      userId: z.string().min(1),
      amount: z.number().int().refine((n) => n !== 0, "amount darf nicht 0 sein"),
      note: z.string().min(3).max(200)
    })
    .parse(req.body);

  const target = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, coinsBalance: true }
  });
  if (!target) return res.status(404).json({ error: "User nicht gefunden" });

  // Bei negativem Adjust: Mindestsaldo 0 erzwingen.
  if (body.amount < 0 && target.coinsBalance + body.amount < 0) {
    return res.status(400).json({
      error: "negative_balance_blocked",
      message: `Saldo ${target.coinsBalance} würde negativ. Korrigiere den Betrag.`
    });
  }

  const refId = `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.coinTransaction.create({
      data: {
        userId: body.userId,
        kind: "ADMIN_ADJUSTMENT",
        amount: body.amount,
        refId,
        note: `[admin:${req.userId}] ${body.note}`
      }
    });
    return tx.user.update({
      where: { id: body.userId },
      data: { coinsBalance: { increment: body.amount } },
      select: { id: true, coinsBalance: true }
    });
  });

  return res.json({
    ok: true,
    userId: updated.id,
    newBalance: updated.coinsBalance,
    refId
  });
});

// =========================================================
// Phase L11.3 — Broker-Lead-Admin (nur fuer Marco / Admins)
// =========================================================

// GET /admin/broker-leads — Liste aller Leads, optional gefiltert nach Status.
app.get("/admin/broker-leads", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const where: Record<string, unknown> = {};
  if (
    status === "NEW" ||
    status === "CONTACTED" ||
    status === "QUALIFIED" ||
    status === "CLOSED_WON" ||
    status === "CLOSED_LOST"
  ) {
    where.status = status;
  }
  const leads = await prisma.brokerLead.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return res.json(leads);
});

// PATCH /admin/broker-leads/:id — Status oder interne Notiz aktualisieren.
const BrokerLeadUpdateSchema = z.object({
  status: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "CLOSED_WON", "CLOSED_LOST"])
    .optional(),
  internalNote: z.string().max(4000).nullable().optional()
});

app.patch("/admin/broker-leads/:id", async (req, res) => {
  if (!(await ensureAdmin(req, res))) return;
  const body = BrokerLeadUpdateSchema.parse(req.body);
  const updated = await prisma.brokerLead.update({
    where: { id: req.params.id },
    data: body as never
  });
  return res.json(updated);
});

// =====================================================================
// Phase F — Offmarket-Layer
// =====================================================================
//
// Additiver Zusatz: bestehendes Listing/Marketplace/Inquiry bleibt
// unveraendert. OffmarketLead/Invite/Message sind eine separate
// Welt, in der Eigentuemer diskret + reverse-marketplace agieren.

const OffmarketLeadInputSchema = z.object({
  title: z.string().min(3).max(200),
  propertyType: z.enum([
    "MFH",
    "COMMERCIAL",
    "MIXED_USE",
    "SINGLE_FAMILY",
    "APARTMENT",
    "LAND",
    "OTHER"
  ]),
  city: z.string().min(2).max(120),
  postalCode: z.string().max(20).optional().nullable(),
  district: z.string().max(120).optional().nullable(),
  fullAddress: z.string().max(300).optional().nullable(),
  anonymizationLevel: z
    .enum(["FULL_ADDRESS", "DISTRICT_ONLY", "CITY_ONLY"])
    .default("CITY_ONLY"),
  approxArea: z.coerce.number().positive(),
  approxPrice: z.coerce.number().int().positive(),
  approxRent: z.coerce.number().int().positive().optional().nullable(),
  description: z.string().min(20).max(8000),
  highlights: z.array(z.string()).max(20).default([]),
  status: z
    .enum(["DRAFT", "ACTIVE", "PAUSED", "CLOSED"])
    .default("DRAFT")
});

// Liefert die anonymisierte Sicht auf ein OffmarketLead fuer einen
// Investor BEVOR die Einladung ACCEPTED wurde. Nach ACCEPTED gibt
// es die volle Sicht via leadFullViewForInvestor().
function leadAnonView(l: {
  id: string;
  title: string;
  propertyType: string;
  city: string;
  district: string | null;
  postalCode: string | null;
  fullAddress: string | null;
  anonymizationLevel: string;
  approxArea: number;
  approxPrice: number;
  approxRent: number | null;
  description: string;
  highlights: string[];
  status: string;
  createdAt: Date;
}) {
  // Adresse je nach Level reduzieren — fullAddress nie an nicht-akzeptierten Investor.
  let location = l.city;
  if (l.anonymizationLevel === "DISTRICT_ONLY" && l.district) {
    location = `${l.city}, ${l.district}`;
  }
  return {
    id: l.id,
    title: l.title,
    propertyType: l.propertyType,
    location,
    city: l.city,
    district: l.anonymizationLevel === "CITY_ONLY" ? null : l.district,
    postalCode: l.anonymizationLevel === "CITY_ONLY" ? null : l.postalCode,
    approxArea: l.approxArea,
    approxPrice: l.approxPrice,
    approxRent: l.approxRent,
    description: l.description,
    highlights: l.highlights,
    status: l.status,
    createdAt: l.createdAt
  };
}

function leadFullView(l: {
  id: string;
  ownerId: string;
  title: string;
  propertyType: string;
  city: string;
  district: string | null;
  postalCode: string | null;
  fullAddress: string | null;
  anonymizationLevel: string;
  approxArea: number;
  approxPrice: number;
  approxRent: number | null;
  description: string;
  highlights: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: l.id,
    ownerId: l.ownerId,
    title: l.title,
    propertyType: l.propertyType,
    city: l.city,
    district: l.district,
    postalCode: l.postalCode,
    fullAddress: l.fullAddress,
    anonymizationLevel: l.anonymizationLevel,
    approxArea: l.approxArea,
    approxPrice: l.approxPrice,
    approxRent: l.approxRent,
    description: l.description,
    highlights: l.highlights,
    status: l.status,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt
  };
}

// Match-Score zwischen Lead und Investor-Profil (0..100).
// Wir bewerten 4 Achsen je 25 Punkte:
//   - Asset-Typ-Match
//   - Region-Match (City exact / PLZ-Praefix / Land enthalten)
//   - Ticket-Range-Match (approxPrice innerhalb [min, max])
//   - Finanzierung (preApproved + Affordability >= approxPrice)
function computeOffmarketMatchScore(
  lead: {
    propertyType: string;
    city: string;
    postalCode: string | null;
    approxPrice: number;
  },
  profile: {
    preferredAssetTypes: string[];
    preferredRegions: string[];
    minTicketSize: number | null;
    maxTicketSize: number | null;
    financingPreApproved: boolean;
    equity: number | null;
    monthlyIncome: number | null;
    monthlyDebt: number | null;
  } | null
): number {
  if (!profile) return 0;
  let score = 0;

  // 1) Asset-Typ
  if (
    profile.preferredAssetTypes.length === 0 ||
    profile.preferredAssetTypes.includes(lead.propertyType)
  ) {
    score += 25;
  }

  // 2) Region
  const regions = profile.preferredRegions.map((r) => r.toLowerCase());
  const cityLc = lead.city.toLowerCase();
  if (regions.length === 0) {
    score += 10; // keine Region gesetzt = neutral
  } else if (
    regions.some(
      (r) =>
        cityLc.includes(r) ||
        r.includes(cityLc) ||
        (lead.postalCode && lead.postalCode.startsWith(r))
    )
  ) {
    score += 25;
  }

  // 3) Ticket-Range
  const min = profile.minTicketSize ?? 0;
  const max = profile.maxTicketSize ?? Number.MAX_SAFE_INTEGER;
  if (lead.approxPrice >= min && lead.approxPrice <= max) {
    score += 25;
  } else if (
    // 80%-Toleranz: noch 12 Punkte, wenn nicht gefuellt
    !profile.minTicketSize &&
    !profile.maxTicketSize
  ) {
    score += 12;
  }

  // 4) Finanzierung
  const aff = computeAffordability({
    equity: profile.equity,
    monthlyIncome: profile.monthlyIncome,
    monthlyDebt: profile.monthlyDebt
  });
  if (profile.financingPreApproved) {
    score += 25;
  } else if (aff.maxInvestment && aff.maxInvestment >= lead.approxPrice) {
    score += 18;
  } else if (aff.maxInvestment && aff.maxInvestment >= lead.approxPrice * 0.7) {
    score += 10;
  }

  return Math.min(100, score);
}

// =====================================================================
// Owner-Endpoints (eigene Leads + Einladungen aussenden)
// =====================================================================

// GET /me/offmarket-leads — Liste eigener Offmarket-Leads
app.get("/me/offmarket-leads", async (req, res) => {
  const leads = await prisma.offmarketLead.findMany({
    where: { ownerId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { invites: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1 // nur Cover-Bild fuer Liste
      }
    }
  });
  res.json(
    leads.map((l) => ({
      ...leadFullView(l),
      _count: l._count,
      images: l.images
    }))
  );
});

// POST /me/offmarket-leads — neues Lead
app.post("/me/offmarket-leads", async (req, res) => {
  const body = OffmarketLeadInputSchema.parse(req.body);
  const lead = await prisma.offmarketLead.create({
    data: {
      ownerId: req.userId!,
      ...body,
      // explizite null/undefined-Normalisierung fuer optional-Felder
      postalCode: body.postalCode ?? null,
      district: body.district ?? null,
      fullAddress: body.fullAddress ?? null,
      approxRent: body.approxRent ?? null
    }
  });
  res.status(201).json(leadFullView(lead));
});

// GET /me/offmarket-leads/:id — Owner-Sicht inkl. Invites + Investor-Profile
app.get("/me/offmarket-leads/:id", async (req, res) => {
  const lead = await prisma.offmarketLead.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      invites: {
        orderBy: { createdAt: "desc" },
        include: {
          investor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              investorProfile: true,
              trackrecordItems: {
                orderBy: [{ year: "desc" }],
                take: 8
              }
            }
          }
        }
      }
    }
  });
  if (!lead) return res.status(404).json({ error: "Lead nicht gefunden" });
  res.json({
    ...leadFullView(lead),
    images: lead.images,
    invites: lead.invites.map((inv) => ({
      id: inv.id,
      createdAt: inv.createdAt,
      status: inv.status,
      ownerNote: inv.ownerNote,
      investorNote: inv.investorNote,
      respondedAt: inv.respondedAt,
      investor: inv.investor
    }))
  });
});

// PATCH /me/offmarket-leads/:id — Felder updaten / Status wechseln
app.patch("/me/offmarket-leads/:id", async (req, res) => {
  const existing = await prisma.offmarketLead.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!existing) return res.status(404).json({ error: "Lead nicht gefunden" });
  const body = OffmarketLeadInputSchema.partial().parse(req.body);
  const updated = await prisma.offmarketLead.update({
    where: { id: existing.id },
    data: body as never
  });
  res.json(leadFullView(updated));
});

// DELETE /me/offmarket-leads/:id
app.delete("/me/offmarket-leads/:id", async (req, res) => {
  const existing = await prisma.offmarketLead.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!existing) return res.status(404).json({ error: "Lead nicht gefunden" });
  await prisma.offmarketLead.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

// GET /me/offmarket-leads/:id/match — Ranking passender Investoren
app.get("/me/offmarket-leads/:id/match", async (req, res) => {
  const lead = await prisma.offmarketLead.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!lead) return res.status(404).json({ error: "Lead nicht gefunden" });

  // Investor-Pool: alle User mit InvestorProfile (Visibility != PRIVATE),
  // ausgenommen der Owner selbst und User, die schon eingeladen wurden.
  const existingInvites = await prisma.offmarketInvite.findMany({
    where: { leadId: lead.id },
    select: { investorId: true }
  });
  const invitedIds = new Set(existingInvites.map((i) => i.investorId));

  const candidates = await prisma.user.findMany({
    where: {
      id: { not: req.userId! },
      investorProfile: { visibility: { in: ["ON_REQUEST", "PUBLIC"] } }
    },
    select: {
      id: true,
      name: true,
      role: true,
      investorProfile: true,
      trackrecordItems: {
        orderBy: [{ year: "desc" }],
        take: 5
      }
    },
    take: 200
  });

  const ranked = candidates
    .map((u) => {
      const p = u.investorProfile;
      const score = computeOffmarketMatchScore(
        {
          propertyType: lead.propertyType,
          city: lead.city,
          postalCode: lead.postalCode,
          approxPrice: lead.approxPrice
        },
        p
          ? {
              preferredAssetTypes: p.preferredAssetTypes,
              preferredRegions: p.preferredRegions,
              minTicketSize: p.minTicketSize,
              maxTicketSize: p.maxTicketSize,
              financingPreApproved: p.financingPreApproved,
              equity: p.equity,
              monthlyIncome: p.monthlyIncome,
              monthlyDebt: p.monthlyDebt
            }
          : null
      );
      const aff = p
        ? computeAffordability({
            equity: p.equity,
            monthlyIncome: p.monthlyIncome,
            monthlyDebt: p.monthlyDebt
          })
        : { maxInvestment: null, maxLoan: null, maxMonthlyDebtService: null };
      return {
        userId: u.id,
        displayName: p?.visibility === "PUBLIC" ? u.name : null, // anonym
        role: u.role,
        score,
        alreadyInvited: invitedIds.has(u.id),
        profile: p
          ? {
              bio: p.bio,
              experienceYears: p.investmentExperienceYears,
              preferredAssetTypes: p.preferredAssetTypes,
              preferredRegions: p.preferredRegions,
              minTicketSize: p.minTicketSize,
              maxTicketSize: p.maxTicketSize,
              financingPreApproved: p.financingPreApproved,
              financingNote: p.financingNote,
              affordability: aff,
              visibility: p.visibility
            }
          : null,
        trackrecordCount: u.trackrecordItems.length,
        trackrecordTop: u.trackrecordItems.slice(0, 3).map((t) => ({
          type: t.type,
          year: t.year,
          location: t.location,
          role: t.role
        }))
      };
    })
    .filter((x) => x.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  res.json({ lead: leadFullView(lead), matches: ranked });
});

// POST /me/offmarket-leads/:id/invite — gezielt einladen
const InviteSchema = z.object({
  investorIds: z.array(z.string().min(1)).min(1).max(50),
  ownerNote: z.string().max(2000).optional().nullable()
});

app.post("/me/offmarket-leads/:id/invite", async (req, res) => {
  const lead = await prisma.offmarketLead.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!lead) return res.status(404).json({ error: "Lead nicht gefunden" });
  if (lead.status === "CLOSED") {
    return res.status(400).json({ error: "Lead ist geschlossen" });
  }
  const body = InviteSchema.parse(req.body);

  // Self-Invite verhindern
  const validIds = body.investorIds.filter((id) => id !== req.userId);

  // Eligible-Check: alle IDs sind echte User mit InvestorProfile
  const users = await prisma.user.findMany({
    where: { id: { in: validIds } },
    select: { id: true, investorProfile: { select: { id: true } } }
  });
  const eligible = users.filter((u) => u.investorProfile).map((u) => u.id);

  const results: Array<{ investorId: string; ok: boolean; note?: string }> = [];
  for (const investorId of eligible) {
    try {
      await prisma.offmarketInvite.create({
        data: {
          leadId: lead.id,
          ownerId: req.userId!,
          investorId,
          status: "PENDING",
          ownerNote: body.ownerNote ?? null
        }
      });
      results.push({ investorId, ok: true });
    } catch (e) {
      // Wahrscheinlich uniq_offmarket_invite Verstoss (schon eingeladen)
      results.push({ investorId, ok: false, note: "bereits eingeladen" });
    }
  }

  // Lead bei erster Einladung von DRAFT auf ACTIVE setzen
  if (lead.status === "DRAFT" && results.some((r) => r.ok)) {
    await prisma.offmarketLead.update({
      where: { id: lead.id },
      data: { status: "ACTIVE" }
    });
  }

  res.status(201).json({ results });
});

// =====================================================================
// Investor-Endpoints (eingegangene Einladungen + Chat)
// =====================================================================

// Helper: Image-View je nach Invite-Status
function imagesForInvestor(
  imgs: { id: string; originalUrl: string; blurredUrl: string | null; stylizedUrl: string | null; alt: string | null; caption: string | null; sortOrder: number }[],
  isAccepted: boolean
) {
  return imgs.map((i) => ({
    id: i.id,
    // Bei PENDING/DECLINED: nur die anonymen Varianten ausliefern
    originalUrl: isAccepted ? i.originalUrl : null,
    blurredUrl: i.blurredUrl,
    stylizedUrl: i.stylizedUrl,
    alt: i.alt,
    caption: i.caption,
    sortOrder: i.sortOrder
  }));
}

// GET /me/offmarket-invites — Liste eingegangener Einladungen
app.get("/me/offmarket-invites", async (req, res) => {
  const invites = await prisma.offmarketInvite.findMany({
    where: { investorId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      lead: {
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1 // Cover
          }
        }
      },
      owner: {
        select: { id: true, name: true, email: true, role: true }
      },
      _count: { select: { messages: true } }
    }
  });
  res.json(
    invites.map((i) => {
      const isAccepted = i.status === "ACCEPTED";
      return {
        id: i.id,
        createdAt: i.createdAt,
        status: i.status,
        ownerNote: i.ownerNote,
        investorNote: i.investorNote,
        respondedAt: i.respondedAt,
        messageCount: i._count.messages,
        // Anonyme Sicht solange PENDING; nach ACCEPT volle Sicht
        lead: {
          ...(isAccepted ? leadFullView(i.lead) : leadAnonView(i.lead)),
          images: imagesForInvestor(i.lead.images, isAccepted)
        },
        // Owner-Kontakt nur nach ACCEPTED
        owner: isAccepted
          ? i.owner
          : {
              id: i.owner.id,
              name: null,
              email: undefined,
              role: i.owner.role
            }
      };
    })
  );
});

// GET /me/offmarket-invites/:id — Detail
app.get("/me/offmarket-invites/:id", async (req, res) => {
  const inv = await prisma.offmarketInvite.findFirst({
    where: {
      id: req.params.id,
      OR: [{ investorId: req.userId! }, { ownerId: req.userId! }]
    },
    include: {
      lead: {
        include: {
          images: { orderBy: { sortOrder: "asc" } }
        }
      },
      owner: { select: { id: true, name: true, email: true, role: true } },
      investor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          investorProfile: true,
          trackrecordItems: {
            orderBy: [{ year: "desc" }],
            take: 8
          }
        }
      }
    }
  });
  if (!inv) return res.status(404).json({ error: "Einladung nicht gefunden" });

  const isInvestor = inv.investorId === req.userId;
  const isOwner = inv.ownerId === req.userId;
  const isAccepted = inv.status === "ACCEPTED";
  const fullImageAccess = isOwner || isAccepted;
  res.json({
    id: inv.id,
    createdAt: inv.createdAt,
    status: inv.status,
    ownerNote: inv.ownerNote,
    investorNote: inv.investorNote,
    respondedAt: inv.respondedAt,
    role: isOwner ? "owner" : "investor",
    lead: {
      ...(fullImageAccess ? leadFullView(inv.lead) : leadAnonView(inv.lead)),
      images: imagesForInvestor(inv.lead.images, fullImageAccess)
    },
    owner:
      isOwner || isAccepted
        ? inv.owner
        : { id: inv.owner.id, name: null, role: inv.owner.role },
    investor: isInvestor
      ? inv.investor
      : isAccepted
        ? inv.investor
        : {
            // Owner-Sicht bei PENDING: trotzdem Profil sichtbar (Investor wusste
            // bei Profil-Anlage, dass er sichtbar werden kann -> Visibility-Setting)
            ...inv.investor,
            email: inv.investor.investorProfile?.visibility === "PUBLIC"
              ? inv.investor.email
              : ""
          },
    canChat: isAccepted
  });
});

// POST /me/offmarket-invites/:id/respond — Investor antwortet (ACCEPT/DECLINE)
const RespondSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
  note: z.string().max(2000).optional().nullable()
});

app.post("/me/offmarket-invites/:id/respond", async (req, res) => {
  const inv = await prisma.offmarketInvite.findFirst({
    where: { id: req.params.id, investorId: req.userId! }
  });
  if (!inv) return res.status(404).json({ error: "Einladung nicht gefunden" });
  if (inv.status !== "PENDING") {
    return res.status(400).json({ error: "Einladung ist nicht mehr offen" });
  }
  const body = RespondSchema.parse(req.body);

  const updated = await prisma.offmarketInvite.update({
    where: { id: inv.id },
    data: {
      status: body.action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
      investorNote: body.note ?? null,
      respondedAt: new Date()
    }
  });
  res.json({ ok: true, status: updated.status });
});

// POST /me/offmarket-invites/:id/withdraw — Owner zieht Einladung zurueck
app.post("/me/offmarket-invites/:id/withdraw", async (req, res) => {
  const inv = await prisma.offmarketInvite.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!inv) return res.status(404).json({ error: "Einladung nicht gefunden" });
  if (inv.status !== "PENDING") {
    return res.status(400).json({ error: "Einladung ist nicht mehr offen" });
  }
  await prisma.offmarketInvite.update({
    where: { id: inv.id },
    data: { status: "WITHDRAWN", respondedAt: new Date() }
  });
  res.json({ ok: true });
});

// =====================================================================
// Chat-Endpoints (Polling, kein WebSocket)
// =====================================================================

// GET /me/offmarket-invites/:id/messages — Chat-Verlauf
app.get("/me/offmarket-invites/:id/messages", async (req, res) => {
  const inv = await prisma.offmarketInvite.findFirst({
    where: {
      id: req.params.id,
      OR: [{ investorId: req.userId! }, { ownerId: req.userId! }]
    }
  });
  if (!inv) return res.status(404).json({ error: "Einladung nicht gefunden" });
  if (inv.status !== "ACCEPTED") {
    return res.status(403).json({ error: "Chat erst nach Annahme freigegeben" });
  }
  const messages = await prisma.offmarketMessage.findMany({
    where: { inviteId: inv.id },
    orderBy: { createdAt: "asc" }
  });
  // Soft-Read: alle nicht von mir, ungelesen -> markieren
  await prisma.offmarketMessage.updateMany({
    where: {
      inviteId: inv.id,
      senderId: { not: req.userId! },
      readAt: null
    },
    data: { readAt: new Date() }
  });
  res.json({ messages });
});

// POST /me/offmarket-invites/:id/messages — neue Nachricht
const MessageBodySchema = z.object({
  body: z.string().min(1).max(8000)
});

app.post("/me/offmarket-invites/:id/messages", async (req, res) => {
  const inv = await prisma.offmarketInvite.findFirst({
    where: {
      id: req.params.id,
      OR: [{ investorId: req.userId! }, { ownerId: req.userId! }]
    }
  });
  if (!inv) return res.status(404).json({ error: "Einladung nicht gefunden" });
  if (inv.status !== "ACCEPTED") {
    return res.status(403).json({ error: "Chat erst nach Annahme freigegeben" });
  }
  const body = MessageBodySchema.parse(req.body);
  const msg = await prisma.offmarketMessage.create({
    data: {
      inviteId: inv.id,
      senderId: req.userId!,
      body: body.body
    }
  });
  res.status(201).json(msg);
});

// =====================================================================
// Discovery — Owner durchsucht anonymisierte Investoren-Liste
// =====================================================================

// GET /offmarket/investors?city=&assetType=&minTicket=&maxTicket=
app.get("/offmarket/investors", requireAuth, async (req, res) => {
  const q = z
    .object({
      city: z.string().optional(),
      assetType: z
        .enum([
          "MFH",
          "COMMERCIAL",
          "MIXED_USE",
          "SINGLE_FAMILY",
          "APARTMENT",
          "LAND",
          "OTHER"
        ])
        .optional(),
      minTicket: z.coerce.number().int().nonnegative().optional(),
      maxTicket: z.coerce.number().int().nonnegative().optional()
    })
    .parse(req.query);

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.userId! },
      investorProfile: { visibility: { in: ["ON_REQUEST", "PUBLIC"] } }
    },
    select: {
      id: true,
      name: true,
      role: true,
      investorProfile: true,
      trackrecordItems: { orderBy: [{ year: "desc" }], take: 3 }
    },
    take: 200
  });

  const filtered = users.filter((u) => {
    const p = u.investorProfile;
    if (!p) return false;
    if (
      q.assetType &&
      p.preferredAssetTypes.length > 0 &&
      !p.preferredAssetTypes.includes(q.assetType)
    )
      return false;
    if (q.city && p.preferredRegions.length > 0) {
      const cityLc = q.city.toLowerCase();
      const ok = p.preferredRegions.some(
        (r) => r.toLowerCase().includes(cityLc) || cityLc.includes(r.toLowerCase())
      );
      if (!ok) return false;
    }
    if (q.minTicket && p.maxTicketSize && p.maxTicketSize < q.minTicket) return false;
    if (q.maxTicket && p.minTicketSize && p.minTicketSize > q.maxTicket) return false;
    return true;
  });

  res.json(
    filtered.map((u) => {
      const p = u.investorProfile!;
      const aff = computeAffordability({
        equity: p.equity,
        monthlyIncome: p.monthlyIncome,
        monthlyDebt: p.monthlyDebt
      });
      return {
        userId: u.id,
        displayName: p.visibility === "PUBLIC" ? u.name : null,
        role: u.role,
        experienceYears: p.investmentExperienceYears,
        bio: p.bio,
        preferredAssetTypes: p.preferredAssetTypes,
        preferredRegions: p.preferredRegions,
        minTicketSize: p.minTicketSize,
        maxTicketSize: p.maxTicketSize,
        financingPreApproved: p.financingPreApproved,
        financingNote: p.financingNote,
        affordability: aff,
        trackrecordCount: u.trackrecordItems.length,
        trackrecordTop: u.trackrecordItems.map((t) => ({
          type: t.type,
          year: t.year,
          location: t.location,
          role: t.role
        })),
        visibility: p.visibility
      };
    })
  );
});

// GET /offmarket/stats — Public Stats fuer Akquise-Landing (anonym)
app.get("/offmarket/stats", async (_req, res) => {
  // Kein Auth — wird vom Public Landing /offmarket-fuer-eigentuemer
  // aufgerufen, zeigt aggregierte Zahlen.
  const [investorCount, preApprovedCount, activeLeadsCount] = await Promise.all([
    prisma.user.count({
      where: {
        investorProfile: { visibility: { in: ["ON_REQUEST", "PUBLIC"] } }
      }
    }),
    prisma.investorProfile.count({
      where: { financingPreApproved: true }
    }),
    prisma.offmarketLead.count({ where: { status: "ACTIVE" } })
  ]);
  const totalTicketAgg = await prisma.investorProfile.aggregate({
    _sum: { maxTicketSize: true }
  });
  res.json({
    investorCount,
    preApprovedCount,
    activeLeadsCount,
    totalTicketSumEUR: totalTicketAgg._sum.maxTicketSize ?? 0
  });
});

// /offmarket/* (oeffentlich-ish): /offmarket/stats darf ohne Auth, die
// anderen Routen darunter brauchen requireAuth (siehe inline an jeder Route).
// Wir mounten requireAuth nicht global auf /offmarket, damit /stats public bleibt.

// =====================================================================
// Phase F.2 + F.3 — Offmarket-Bilder
// =====================================================================
//
// Frontend laedt das Original-Bild via /api/upload-image hoch (Vercel Blob)
// und sendet die resultierende URL hier rein. Backend erzeugt automatisch
// die Blur-Variante (sharp). Stilisierung (KI) auf manuellen Aufruf.

import {
  generateBlurredVariant,
  generateStylizedVariant
} from "./lib/imageProcessing.js";

// GET /me/offmarket-leads/:id/images — Liste eigener Bilder (Owner-Sicht)
app.get("/me/offmarket-leads/:id/images", async (req, res) => {
  const lead = await prisma.offmarketLead.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    select: { id: true }
  });
  if (!lead) return res.status(404).json({ error: "Lead nicht gefunden" });
  const imgs = await prisma.offmarketLeadImage.findMany({
    where: { leadId: lead.id },
    orderBy: { sortOrder: "asc" }
  });
  res.json(imgs);
});

// POST /me/offmarket-leads/:id/images — neues Bild registrieren
// Body: { originalUrl, alt? }
// Backend triggert async die Blur-Generierung.
const ImageInputSchema = z.object({
  originalUrl: z.string().url(),
  alt: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().optional()
});

app.post("/me/offmarket-leads/:id/images", async (req, res) => {
  const lead = await prisma.offmarketLead.findFirst({
    where: { id: req.params.id, ownerId: req.userId! }
  });
  if (!lead) return res.status(404).json({ error: "Lead nicht gefunden" });
  const body = ImageInputSchema.parse(req.body);

  const count = await prisma.offmarketLeadImage.count({ where: { leadId: lead.id } });
  if (count >= 12) {
    return res.status(400).json({ error: "Max. 12 Bilder pro Inserat" });
  }

  // Erstmal Eintrag anlegen (ohne blurredUrl), damit der Client sofort
  // den Eintrag sieht.
  const created = await prisma.offmarketLeadImage.create({
    data: {
      leadId: lead.id,
      originalUrl: body.originalUrl,
      alt: body.alt ?? null,
      sortOrder: body.sortOrder ?? count
    }
  });

  // Async Blur generieren — Client kann erneut GET aufrufen oder direkt
  // mit CSS-Blur arbeiten, bis blurredUrl da ist.
  generateBlurredVariant(
    body.originalUrl,
    req.userId!,
    lead.id,
    created.id
  )
    .then((blurredUrl) =>
      prisma.offmarketLeadImage.update({
        where: { id: created.id },
        data: { blurredUrl }
      })
    )
    .catch((e) => console.error("blur generate failed", e));

  res.status(201).json(created);
});

// DELETE /me/offmarket-leads/:id/images/:imageId
app.delete("/me/offmarket-leads/:id/images/:imageId", async (req, res) => {
  const lead = await prisma.offmarketLead.findFirst({
    where: { id: req.params.id, ownerId: req.userId! },
    select: { id: true }
  });
  if (!lead) return res.status(404).json({ error: "Lead nicht gefunden" });
  const img = await prisma.offmarketLeadImage.findFirst({
    where: { id: req.params.imageId, leadId: lead.id }
  });
  if (!img) return res.status(404).json({ error: "Bild nicht gefunden" });
  await prisma.offmarketLeadImage.delete({ where: { id: img.id } });
  res.json({ ok: true });
});

// POST /me/offmarket-leads/:id/images/:imageId/stylize — KI-Stilisierung
// (Stufe 3). Triggert Claude-Beschreibung + OpenAI Image-Generation.
// Synchron (kann ~30 Sek dauern); fuer Production-Scale spaeter besser
// als Job-Queue.
app.post(
  "/me/offmarket-leads/:id/images/:imageId/stylize",
  async (req, res) => {
    const lead = await prisma.offmarketLead.findFirst({
      where: { id: req.params.id, ownerId: req.userId! },
      select: { id: true }
    });
    if (!lead) return res.status(404).json({ error: "Lead nicht gefunden" });
    const img = await prisma.offmarketLeadImage.findFirst({
      where: { id: req.params.imageId, leadId: lead.id }
    });
    if (!img) return res.status(404).json({ error: "Bild nicht gefunden" });

    try {
      const { url, caption } = await generateStylizedVariant(
        img.originalUrl,
        req.userId!,
        lead.id,
        img.id
      );
      const updated = await prisma.offmarketLeadImage.update({
        where: { id: img.id },
        data: { stylizedUrl: url, caption }
      });
      res.json(updated);
    } catch (e) {
      console.error("stylize failed", e);
      res.status(503).json({
        error: "Stilisierung fehlgeschlagen",
        detail: (e as Error).message
      });
    }
  }
);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`DealFlow AI API listening on http://localhost:${port}`);
});
