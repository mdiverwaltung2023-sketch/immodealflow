import { z } from "zod";

export const DealStatusEnum = z.enum([
  "WATCHING",
  "INQUIRED",
  "NEGOTIATING",
  "LOI",
  "NOTAR",
  "CLOSED",
  "REJECTED"
]);
export type DealStatus = z.infer<typeof DealStatusEnum>;

export const STATUS_LABELS: Record<DealStatus, string> = {
  WATCHING: "Beobachtung",
  INQUIRED: "Angefragt",
  NEGOTIATING: "Verhandlung",
  LOI: "LOI",
  NOTAR: "Notartermin",
  CLOSED: "Gekauft",
  REJECTED: "Abgelehnt"
};

export const STATUS_ORDER: DealStatus[] = [
  "WATCHING",
  "INQUIRED",
  "NEGOTIATING",
  "LOI",
  "NOTAR",
  "CLOSED",
  "REJECTED"
];

export const PropertySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string(),
  price: z.number(),
  rent: z.number(),
  location: z.string(),
  size: z.number(),
  status: DealStatusEnum,
  dealType: z.enum(["FREE_SALE", "AUCTION"]).default("FREE_SALE")
});

export const AnalysisSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  propertyId: z.string(),
  scenarioName: z.string(),

  equityRatio: z.number(),
  loanInterestRate: z.number(),
  loanRepaymentRate: z.number(),
  taxRateIncome: z.number(),
  closingCostsRate: z.number(),
  maintenanceRate: z.number(),
  vacancyRate: z.number(),
  buildingShare: z.number(),
  afaRate: z.number(),

  closingCosts: z.number(),
  totalInvestment: z.number(),
  equity: z.number(),
  loan: z.number(),
  monthlyInterest: z.number(),
  monthlyRepayment: z.number(),
  monthlyAfA: z.number(),
  monthlyMaintenance: z.number(),
  monthlyVacancyLoss: z.number(),

  grossYield: z.number(),
  netYield: z.number(),
  cashflow: z.number(),
  cashflowAfterTax: z.number(),
  score: z.number()
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export const DEFAULT_ASSUMPTIONS = {
  equityRatio: 0.20,
  loanInterestRate: 0.038,
  loanRepaymentRate: 0.02,
  taxRateIncome: 0.42,
  closingCostsRate: 0.10,
  maintenanceRate: 0.30,
  vacancyRate: 0.05,
  buildingShare: 0.80,
  afaRate: 0.02
};

export const OfferSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  propertyId: z.string(),
  suggestedPrice: z.number(),
  message: z.string(),
  model: z.string().nullable().optional()
});

export const NoteSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  propertyId: z.string(),
  body: z.string()
});

export const MarketRatingEnum = z.enum(["below_market", "fair", "above_market"]);
export type MarketRating = z.infer<typeof MarketRatingEnum>;

export const MARKET_RATING_LABELS: Record<MarketRating, string> = {
  below_market: "Unter Marktwert",
  fair: "Fairer Preis",
  above_market: "Über Marktwert"
};

export const MarketComparisonSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  propertyId: z.string(),
  rentPerSqmLow: z.number(),
  rentPerSqmHigh: z.number(),
  pricePerSqmLow: z.number(),
  pricePerSqmHigh: z.number(),
  rating: MarketRatingEnum,
  rationale: z.string(),
  dataCaveat: z.string(),
  model: z.string().nullable().optional()
});

export type MarketComparisonT = z.infer<typeof MarketComparisonSchema>;

export const DealTypeEnum = z.enum(["FREE_SALE", "AUCTION"]);
export type DealType = z.infer<typeof DealTypeEnum>;

export const AuctionTypeEnum = z.enum(["ZVG", "DGA", "SDL", "KARHAUSEN", "OTHER"]);
export type AuctionTypeT = z.infer<typeof AuctionTypeEnum>;

export const AUCTION_TYPE_LABELS: Record<AuctionTypeT, string> = {
  ZVG: "Zwangsversteigerung",
  DGA: "Deutsche Grundstücksauktionen",
  SDL: "SDL Auktionen",
  KARHAUSEN: "Karhausen",
  OTHER: "Andere"
};

export const AuctionInfoSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  propertyId: z.string(),
  auctionType: AuctionTypeEnum,
  caseNumber: z.string().nullable().optional(),
  marketValue: z.number().nullable().optional(),
  auctionDate: z.string().nullable().optional(),
  auctionLocation: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  rawText: z.string().nullable().optional(),
  bidLimit: z.number().nullable().optional(),
  bidLimitNeutral: z.number().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type AuctionInfoT = z.infer<typeof AuctionInfoSchema>;

export const ImportExposeResponseSchema = z.object({
  title: z.string(),
  price: z.number(),
  rent: z.number(),
  location: z.string(),
  size: z.number(),
  confidence: z.string().optional(),
  notes: z.string().optional()
});

export const PropertyListItemSchema = PropertySchema.extend({
  analyses: z.array(AnalysisSchema).optional(),
  offer: OfferSchema.nullable().optional(),
  auction: AuctionInfoSchema.nullable().optional()
});

export const PropertyDetailSchema = PropertySchema.extend({
  analyses: z.array(AnalysisSchema).optional(),
  offer: OfferSchema.nullable().optional(),
  notes: z.array(NoteSchema).optional(),
  marketComparison: MarketComparisonSchema.nullable().optional(),
  auction: AuctionInfoSchema.nullable().optional()
});

function baseUrl() {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_BASE_URL fehlt");
  return url.replace(/\/+$/, "");
}

/**
 * Holt das aktuelle Clerk-JWT für API-Anfragen aus Server Components.
 * Importiert `auth` dynamisch, damit Client-Components, die diese Datei
 * mit-bundlen, nicht über server-only Code stolpern.
 */
async function getServerAuthHeader(): Promise<Record<string, string>> {
  // Lazy import vermeidet Bundle-Konflikte in Client-Components
  const { auth } = await import("@clerk/nextjs/server");
  const a = await auth();
  const token = await a.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const headers = await getServerAuthHeader();
  const res = await fetch(`${baseUrl()}${path}`, { cache: "no-store", headers });
  if (!res.ok) throw new Error(`GET ${path} fehlgeschlagen (${res.status})`);
  const json = await res.json();
  return schema.parse(json);
}

export async function apiPost<T>(
  path: string,
  body: unknown | undefined,
  schema: z.ZodType<T>
): Promise<T> {
  const headers = await getServerAuthHeader();
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`POST ${path} fehlgeschlagen (${res.status}) ${txt}`);
  }
  const json = await res.json();
  return schema.parse(json);
}
