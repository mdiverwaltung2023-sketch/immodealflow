import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";
import { computeCashflow, computeGrossYield, computeScore } from "./lib/calc.js";
import { generateOfferWithClaude } from "./lib/claude.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(",").map((s) => s.trim()) ?? true
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

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

app.post("/properties", async (req, res) => {
  const parsed = PropertyCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const property = await prisma.property.create({ data: parsed.data });
  return res.status(201).json(property);
});

app.get("/properties", async (req, res) => {
  const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
  const statusParsed = statusParam ? DealStatusEnum.safeParse(statusParam) : null;
  if (statusParam && !statusParsed?.success) {
    return res.status(400).json({ error: "Invalid status filter" });
  }

  const properties = await prisma.property.findMany({
    where: statusParsed?.success ? { status: statusParsed.data } : undefined,
    orderBy: { updatedAt: "desc" },
    include: { analysis: true, offer: true }
  });
  return res.json(properties);
});

app.get("/properties/:id", async (req, res) => {
  const { id } = req.params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      analysis: true,
      offer: true,
      notes: { orderBy: { createdAt: "desc" } }
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

  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const property = await prisma.property.update({
    where: { id },
    data: parsed.data
  });
  return res.json(property);
});

app.delete("/properties/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.property.findUnique({ where: { id } });
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

  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const note = await prisma.note.create({
    data: {
      propertyId: id,
      body: parsed.data.body
    }
  });

  // Touch property updatedAt so dashboard sort reflects activity
  await prisma.property.update({ where: { id }, data: { updatedAt: new Date() } });

  return res.status(201).json(note);
});

app.delete("/notes/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const existing = await prisma.note.findUnique({ where: { id: noteId } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  await prisma.note.delete({ where: { id: noteId } });
  return res.status(204).end();
});

app.post("/analyze/:id", async (req, res) => {
  const { id } = req.params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) return res.status(404).json({ error: "Not found" });

  const grossYield = computeGrossYield(property.price, property.rent);
  const cashflow = computeCashflow(property.price, property.rent);
  const score = computeScore(grossYield, cashflow);

  const analysis = await prisma.analysis.upsert({
    where: { propertyId: id },
    create: {
      propertyId: id,
      grossYield,
      cashflow,
      score
    },
    update: {
      grossYield,
      cashflow,
      score
    }
  });

  return res.json(analysis);
});

app.post("/offer/:id", async (req, res) => {
  const { id } = req.params;
  const property = await prisma.property.findUnique({ where: { id } });
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

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  return res.status(500).json({ error: message });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`DealFlow AI API listening on http://localhost:${port}`);
});
