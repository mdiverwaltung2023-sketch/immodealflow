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

// --- Listing-v2 Enums ----------------------------------------------

export const BuildingConditionEnum = z.enum([
  "NEW",
  "REFURBISHED",
  "MODERNIZED",
  "MAINTAINED",
  "NEEDS_RENOVATION"
]);
export type BuildingConditionT = z.infer<typeof BuildingConditionEnum>;
export const BUILDING_CONDITION_LABELS: Record<BuildingConditionT, string> = {
  NEW: "Erstbezug nach Sanierung / Neubau",
  REFURBISHED: "Kernsaniert",
  MODERNIZED: "Modernisiert",
  MAINTAINED: "Gepflegt",
  NEEDS_RENOVATION: "Sanierungsbedürftig"
};

export const EnergyClassEnum = z.enum([
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
export type EnergyClassT = z.infer<typeof EnergyClassEnum>;
export const ENERGY_CLASS_LABELS: Record<EnergyClassT, string> = {
  A_PLUS: "A+",
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
  F: "F",
  G: "G",
  H: "H"
};

export const EnergyCarrierEnum = z.enum([
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
export type EnergyCarrierT = z.infer<typeof EnergyCarrierEnum>;
export const ENERGY_CARRIER_LABELS: Record<EnergyCarrierT, string> = {
  GAS: "Gas",
  OIL: "Öl",
  ELECTRIC: "Strom",
  DISTRICT_HEATING: "Fernwärme",
  HEAT_PUMP: "Wärmepumpe",
  PELLETS: "Pellets",
  WOOD: "Holz",
  SOLAR: "Solar",
  OTHER: "Sonstiges"
};

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
  images: z.array(ListingImageSchema).default([]),

  // --- Listing v2: Bausubstanz ---
  yearBuilt: z.number().nullable().optional(),
  lastRenovation: z.number().nullable().optional(),
  condition: BuildingConditionEnum.nullable().optional(),
  livingArea: z.number().nullable().optional(),
  commercialArea: z.number().nullable().optional(),
  landArea: z.number().nullable().optional(),
  floors: z.number().nullable().optional(),

  // --- Einheiten ---
  residentialUnits: z.number().nullable().optional(),
  commercialUnits: z.number().nullable().optional(),

  // --- Energie ---
  energyClass: EnergyClassEnum.nullable().optional(),
  energyConsumption: z.number().nullable().optional(),
  energyCarrier: EnergyCarrierEnum.nullable().optional(),
  heatingType: z.string().nullable().optional(),

  // --- Vermietung (USP) ---
  actualRent: z.number().nullable().optional(),
  vacancyRate: z.number().nullable().optional(),
  waltMonths: z.number().nullable().optional(),
  rentIndexed: z.boolean().nullable().optional(),
  rentEscalation: z.boolean().nullable().optional(),
  rentUpsidePotential: z.number().nullable().optional(),

  // --- Modernisierung ---
  modernizationBacklog: z.number().nullable().optional(),
  gegCompliant: z.boolean().nullable().optional(),

  // --- Provision ---
  commissionRate: z.number().nullable().optional(),
  commissionFree: z.boolean().nullable().optional(),
  buyerCommission: z.number().nullable().optional(),

  // --- Verfügbarkeit ---
  availableFrom: z.string().nullable().optional(),

  // --- Tags ---
  features: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),

  // --- Tenant-Mix (Gewerbe) ---
  tenantCount: z.number().nullable().optional(),
  anchorTenant: z.string().nullable().optional(),
  tenantSectors: z.array(z.string()).default([])
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

// --- Ratings (Push E) -------------------------------------------
// Hier oben definiert, weil MarketplaceListingDetailSchema und
// InquiryDetailWithRatingsSchema das RatingSummarySchema referenzieren.

export const RatingDirectionEnum = z.enum(["INVESTOR_TO_SELLER", "SELLER_TO_INVESTOR"]);
export type RatingDirectionT = z.infer<typeof RatingDirectionEnum>;

export const RatingSummarySchema = z.object({
  avg: z.number().nullable(),
  count: z.number()
});
export type RatingSummaryT = z.infer<typeof RatingSummarySchema>;

export const RatingSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  inquiryId: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  direction: RatingDirectionEnum,
  stars: z.number().int(),
  body: z.string(),
  rebuttal: z.string().nullable().optional(),
  rebuttalAt: z.string().nullable().optional()
});
export type RatingT = z.infer<typeof RatingSchema>;

export const RatingsReceivedResponseSchema = z.object({
  summary: RatingSummarySchema,
  ratings: z.array(
    RatingSchema.extend({
      fromUser: z.object({
        id: z.string(),
        name: z.string().nullable().optional(),
        role: UserRoleEnum
      }),
      inquiry: z.object({
        id: z.string(),
        listing: z.object({
          id: z.string(),
          title: z.string(),
          city: z.string(),
          propertyType: AssetTypeEnum
        })
      })
    })
  )
});

// Detail-Endpoint /marketplace/:id liefert zusätzlich myInquiry + isOwner
export const InquiryStatusEnum = z.enum(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"]);
export type InquiryStatusT = z.infer<typeof InquiryStatusEnum>;

export const INQUIRY_STATUS_LABELS: Record<InquiryStatusT, string> = {
  PENDING: "Offen",
  ACCEPTED: "Angenommen",
  REJECTED: "Abgelehnt",
  WITHDRAWN: "Zurückgezogen"
};

export const MarketplaceListingDetailSchema = MarketplaceListingSchema.extend({
  myInquiry: z
    .object({
      id: z.string(),
      status: InquiryStatusEnum,
      createdAt: z.string()
    })
    .nullable()
    .optional(),
  isOwner: z.boolean(),
  sellerRating: RatingSummarySchema.optional()
});
export type MarketplaceListingDetailT = z.infer<typeof MarketplaceListingDetailSchema>;

// Investor-Sicht: meine eigenen Anfragen
export const MyInquirySellerSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().optional(), // nur bei ACCEPTED
  role: UserRoleEnum
});

export const MyInquirySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: InquiryStatusEnum,
  message: z.string(),
  response: z.string().nullable().optional(),
  respondedAt: z.string().nullable().optional(),
  listing: ListingSchema,
  seller: MyInquirySellerSchema
});
export type MyInquiryT = z.infer<typeof MyInquirySchema>;

// Verkäufer-Sicht: Anfragen auf eigenem Listing inkl. Investor-Profil-Snapshot
export const InvestorSnapshotSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string(),
  role: UserRoleEnum,
  investorProfile: z
    .object({
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
      visibility: ProfileVisibilityEnum
    })
    .nullable()
    .optional(),
  trackrecordItems: z.array(TrackrecordItemSchema)
});


// Sicht im Inquiry-Detail (Investor-Seite)
export const InquiryDetailWithRatingsSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: InquiryStatusEnum,
  message: z.string(),
  response: z.string().nullable().optional(),
  respondedAt: z.string().nullable().optional(),
  listing: ListingSchema,
  seller: z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().optional(),
    role: UserRoleEnum
  }),
  sellerSummary: RatingSummarySchema,
  myRating: RatingSchema.nullable(),
  sellerRating: RatingSchema.nullable(),
  canRate: z.boolean()
});
export type InquiryDetailWithRatingsT = z.infer<typeof InquiryDetailWithRatingsSchema>;

// SellerInquirySchema (existierend) — erweitert um Rating-Info
export const SellerInquirySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: InquiryStatusEnum,
  message: z.string(),
  response: z.string().nullable().optional(),
  respondedAt: z.string().nullable().optional(),
  investor: InvestorSnapshotSchema.nullable(),
  investorSummary: RatingSummarySchema.optional(),
  myRating: RatingSchema.nullable().optional(),
  investorRatingOnMe: RatingSchema.nullable().optional(),
  canRate: z.boolean().optional()
});
export type SellerInquiryT = z.infer<typeof SellerInquirySchema>;

// /me/listings/:id/inquiries-Response (mit Listing-Status)
export const ListingInquiriesResponseSchema = z.object({
  listingStatus: ListingStatusEnum,
  inquiries: z.array(SellerInquirySchema)
});

// fetch-Funktionen wurden in lib/api-server.ts ausgelagert (server-only),
// damit Client-Components diese Datei sicher mit-importieren können.
