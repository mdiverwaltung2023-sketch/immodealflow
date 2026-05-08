import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "./lib/prisma.js";
import {
  computeFullAnalysis,
  computeBidLimit,
  DEFAULT_ASSUMPTIONS,
  type AnalysisAssumptions
} from "./lib/calc.js";
import {
  generateOfferWithClaude,
  extractPropertyFromText,
  extractAuctionFromText,
  extractAuctionListFromText,
  marketComparisonForProperty
} from "./lib/claude.js";
import { extractTextFromPdfBase64 } from "./lib/pdf.js";
import { requireAuth } from "./lib/auth.js";
import {
  countActiveListings,
  countInquiriesLast30d,
  getPlanLimits,
  paywallBody,
  type PlanT
} from "./lib/billing.js";

// --- Stripe-Client (lazy, optional) ---
// Wenn STRIPE_SECRET_KEY fehlt, laufen Billing-Endpoints im Stub-Modus
// und antworten 503 mit klarer Meldung — App startet trotzdem.
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe: Stripe | null = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2025-09-30.clover" })
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

const PropertyCreateSchema = z.object({
  title: z.string().min(1),
  price: z.number().int().positive(),
  rent: z.number().int().nonnegative(),
  location: z.string().min(1),
  size: z.number().positive(),
  status: DealStatusEnum.optional()
});

const PropertyUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  price: z.number().int().positive().optional(),
  rent: z.number().int().nonnegative().optional(),
  location: z.string().min(1).optional(),
  size: z.number().positive().optional(),
  status: DealStatusEnum.optional()
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

// /me — eingeloggter User selbst
app.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "User not found" });
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
    planValidUntil: user.planValidUntil
  });
});

const UserRoleEnum = z.enum(["INVESTOR", "SELLER", "BOTH"]);

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
// werden gleich Rolle und Name gesetzt.
app.post("/me/complete-onboarding", async (req, res) => {
  const body = z
    .object({
      role: UserRoleEnum.optional(),
      name: z.string().min(1).max(120).optional()
    })
    .parse(req.body ?? {});
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...body,
      onboardingCompletedAt: new Date()
    }
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
            message: `Du hast bereits ${active} aktive Inserate. Dein Plan (${plan}) erlaubt maximal ${limits.activeListingsMax}. Verkäufer Pro hebt das Limit auf 10.`,
            upgradeTo: "SELLER_PRO",
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

  // Phase G4 — Premium-Sortierung: aktiv-featured Listings nach oben.
  // featured = featuredUntil > now. Innerhalb der beiden Gruppen bleibt
  // updatedAt-DESC (kommt schon aus der DB-Sortierung).
  const nowMs = Date.now();
  yieldFiltered.sort((a, b) => {
    const aF = a.featuredUntil && a.featuredUntil.getTime() > nowMs ? 1 : 0;
    const bF = b.featuredUntil && b.featuredUntil.getTime() > nowMs ? 1 : 0;
    if (aF !== bF) return bF - aF;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  // Bewertungs-Summary pro Verkäufer dazuladen + Verifiziert-Flag
  const enriched = await Promise.all(
    yieldFiltered.slice(0, 100).map(async (l) => {
      const ownerVerified =
        (l.owner as { plan?: string } | null)?.plan === "INVESTOR_PRO" ||
        (l.owner as { plan?: string } | null)?.plan === "SELLER_PRO";
      const featured =
        !!l.featuredUntil && l.featuredUntil.getTime() > nowMs;
      // owner.plan im Response weglassen — Plan ist intern.
      const { owner: ownerWithPlan, ...rest } = anonymizeListing(l);
      const owner = ownerWithPlan
        ? {
            id: (ownerWithPlan as { id: string }).id,
            name: (ownerWithPlan as { name: string | null }).name,
            role: (ownerWithPlan as { role: string }).role
          }
        : null;
      return {
        ...rest,
        owner,
        ownerVerified,
        featured,
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

  const ownerVerified =
    listing.owner?.plan === "INVESTOR_PRO" ||
    listing.owner?.plan === "SELLER_PRO";
  const featured =
    !!listing.featuredUntil && listing.featuredUntil.getTime() > Date.now();

  // owner.plan im Response weglassen — Plan ist intern.
  const { owner: ownerWithPlan, ...rest } = anonymizeListing(listing);
  const owner = ownerWithPlan
    ? {
        id: (ownerWithPlan as { id: string }).id,
        name: (ownerWithPlan as { name: string | null }).name,
        role: (ownerWithPlan as { role: string }).role
      }
    : null;

  return res.json({
    ...rest,
    owner,
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
      const periodEnd = (item as { current_period_end?: number } | undefined)?.current_period_end;
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

      const periodEnd = (item as { current_period_end?: number } | undefined)?.current_period_end;
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

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`DealFlow AI API listening on http://localhost:${port}`);
});
