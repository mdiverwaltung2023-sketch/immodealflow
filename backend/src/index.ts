import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
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

const app = express();

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
    legacyCount
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

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`DealFlow AI API listening on http://localhost:${port}`);
});
