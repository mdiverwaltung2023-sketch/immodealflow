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

export const UserRoleEnum = z.enum(["INVESTOR", "SELLER", "BOTH"]);
export type UserRoleT = z.infer<typeof UserRoleEnum>;

export const USER_ROLE_LABELS: Record<UserRoleT, string> = {
  INVESTOR: "Investor",
  SELLER: "Verkäufer",
  BOTH: "Beides"
};

export const MeSchema = z.object({
  id: z.string(),
  clerkId: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  role: UserRoleEnum,
  onboardingCompletedAt: z.string().nullable().optional(),
  legacyCount: z.number().optional()
});

export type Me = z.infer<typeof MeSchema>;

// --- Investor-Profil + Trackrecord (Push B) ----------------------

export const AssetTypeEnum = z.enum([
  "MFH",
  "COMMERCIAL",
  "MIXED_USE",
  "SINGLE_FAMILY",
  "APARTMENT",
  "LAND",
  "OTHER"
]);
export type AssetTypeT = z.infer<typeof AssetTypeEnum>;

export const ASSET_TYPE_LABELS: Record<AssetTypeT, string> = {
  MFH: "Mehrfamilienhaus",
  COMMERCIAL: "Gewerbe",
  MIXED_USE: "Wohn/Gewerbe-Mix",
  SINGLE_FAMILY: "Einfamilienhaus",
  APARTMENT: "Eigentumswohnung",
  LAND: "Grundstück",
  OTHER: "Sonstige"
};

export const ProfileVisibilityEnum = z.enum(["PRIVATE", "ON_REQUEST", "PUBLIC"]);
export type ProfileVisibilityT = z.infer<typeof ProfileVisibilityEnum>;

export const PROFILE_VISIBILITY_LABELS: Record<ProfileVisibilityT, string> = {
  PRIVATE: "Privat",
  ON_REQUEST: "Nur bei Anfrage",
  PUBLIC: "Öffentlich"
};

export const TrackrecordRoleEnum = z.enum([
  "BUYER",
  "SELLER",
  "PARTNER",
  "BROKER",
  "OTHER"
]);
export type TrackrecordRoleT = z.infer<typeof TrackrecordRoleEnum>;

export const TRACKRECORD_ROLE_LABELS: Record<TrackrecordRoleT, string> = {
  BUYER: "Käufer",
  SELLER: "Verkäufer",
  PARTNER: "Partner",
  BROKER: "Makler",
  OTHER: "Sonstige"
};

export const AffordabilitySchema = z.object({
  maxMonthlyDebtService: z.number().nullable(),
  maxLoan: z.number().nullable(),
  maxInvestment: z.number().nullable()
});

export const TrackrecordItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userId: z.string(),
  type: AssetTypeEnum,
  year: z.number(),
  value: z.number().nullable().optional(),
  location: z.string(),
  role: TrackrecordRoleEnum,
  description: z.string().nullable().optional(),
  verifiedBy: z.string().nullable().optional()
});
export type TrackrecordItemT = z.infer<typeof TrackrecordItemSchema>;

export const InvestorProfileSchema = z.object({
  bio: z.string().nullable().optional(),
  investmentExperienceYears: z.number().int(),
  equity: z.number().nullable().optional(),
  monthlyIncome: z.number().nullable().optional(),
  monthlyDebt: z.number().nullable().optional(),
  financingPreApproved: z.boolean(),
  financingNote: z.string().nullable().optional(),
  preferredAssetTypes: z.array(AssetTypeEnum),
  preferredRegions: z.array(z.string()),
  minTicketSize: z.number().nullable().optional(),
  maxTicketSize: z.number().nullable().optional(),
  visibility: ProfileVisibilityEnum,
  affordability: AffordabilitySchema,
  trackrecord: z.array(TrackrecordItemSchema)
});
export type InvestorProfileT = z.infer<typeof InvestorProfileSchema>;

// --- Listings + Marketplace (Push C) ----------------------------

export const ListingStatusEnum = z.enum([
  "DRAFT",
  "ACTIVE",
  "IN_NEGOTIATION",
  "SOLD",
  "ARCHIVED"
]);
export type ListingStatusT = z.infer<typeof ListingStatusEnum>;

export const LISTING_STATUS_LABELS: Record<ListingStatusT, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  IN_NEGOTIATION: "In Verhandlung",
  SOLD: "Verkauft",
  ARCHIVED: "Archiviert"
};

export const LISTING_STATUS_ORDER: ListingStatusT[] = [
  "DRAFT",
  "ACTIVE",
  "IN_NEGOTIATION",
  "SOLD",
  "ARCHIVED"
];

export const AnonymizationLevelEnum = z.enum([
  "FULL_ADDRESS",
  "DISTRICT_ONLY",
  "CITY_ONLY"
]);
export type AnonymizationLevelT = z.infer<typeof AnonymizationLevelEnum>;

export const ANONYMIZATION_LABELS: Record<AnonymizationLevelT, string> = {
  FULL_ADDRESS: "Vollständige Adresse",
  DISTRICT_ONLY: "Stadt + Stadtteil",
  CITY_ONLY: "Nur Stadt"
};

export const ListingImageSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  listingId: z.string(),
  url: z.string(),
  alt: z.string().nullable().optional(),
  sortOrder: z.number()
});
export type ListingImageT = z.infer<typeof ListingImageSchema>;

export const ListingSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ownerId: z.string(),
  title: z.string(),
  description: z.string(),
  propertyType: AssetTypeEnum,
  status: ListingStatusEnum,
  askingPrice: z.number(),
  totalArea: z.number(),
  totalRent: z.number().nullable().optional(),
  city: z.string(),
  postalCode: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  fullAddress: z.string().nullable().optional(),
  anonymizationLevel: AnonymizationLevelEnum,
  images: z.array(ListingImageSchema).default([])
});
export type ListingT = z.infer<typeof ListingSchema>;

export const MarketplaceListingSchema = ListingSchema.extend({
  owner: z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    role: UserRoleEnum
  })
});
export type MarketplaceListingT = z.infer<typeof MarketplaceListingSchema>;

// fetch-Funktionen wurden in lib/api-server.ts ausgelagert (server-only),
// damit Client-Components diese Datei sicher mit-importieren können.
