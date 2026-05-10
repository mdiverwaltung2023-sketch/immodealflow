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
export type PropertyListItemT = z.infer<typeof PropertyListItemSchema>;

export const PropertyDetailSchema = PropertySchema.extend({
  analyses: z.array(AnalysisSchema).optional(),
  offer: OfferSchema.nullable().optional(),
  notes: z.array(NoteSchema).optional(),
  marketComparison: MarketComparisonSchema.nullable().optional(),
  auction: AuctionInfoSchema.nullable().optional()
});

export const UserRoleEnum = z.enum([
  "INVESTOR",
  "SELLER",
  "BOTH",
  "BROKER",
  "LANDLORD"
]);
export type UserRoleT = z.infer<typeof UserRoleEnum>;

export const USER_ROLE_LABELS: Record<UserRoleT, string> = {
  INVESTOR: "Investor",
  SELLER: "Verkäufer",
  BOTH: "Beides",
  BROKER: "Makler",
  LANDLORD: "Vermieter"
};

// --- Subscription / Billing (Phase G1+G2) -----------------------

export const UserPlanEnum = z.enum(["FREE", "INVESTOR_PRO", "SELLER_PRO"]);
export type UserPlanT = z.infer<typeof UserPlanEnum>;

export const USER_PLAN_LABELS: Record<UserPlanT, string> = {
  FREE: "Free",
  INVESTOR_PRO: "Investor Pro",
  SELLER_PRO: "Verkäufer Pro"
};

export const BillingStateSchema = z.object({
  plan: UserPlanEnum,
  planValidUntil: z.string().nullable().optional(),
  hasSubscription: z.boolean(),
  stripeReady: z.boolean()
});
export type BillingStateT = z.infer<typeof BillingStateSchema>;

export const MeSchema = z.object({
  id: z.string(),
  clerkId: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  role: UserRoleEnum,
  onboardingCompletedAt: z.string().nullable().optional(),
  legacyCount: z.number().optional(),
  // Phase G1: Plan kommt aus /me jetzt mit (Backend hat Feld auf User)
  plan: UserPlanEnum.optional(),
  planValidUntil: z.string().nullable().optional(),
  // Phase H3: Coin-System
  coinsBalance: z.number().optional(),
  isEarlyBird: z.boolean().optional(),
  // Phase H8: Admin-Flag
  isAdmin: z.boolean().optional()
});

export type Me = z.infer<typeof MeSchema>;

// --- Coin-System (Phase H4 + H5) -------------------------------

export const CoinTxKindEnum = z.enum([
  "PROFILE_COMPLETED",
  "LISTING_ACTIVATED",
  "SELLER_CONTACTED",
  "DAILY_LOGIN",
  "REFERRAL_BROKER_ONBOARDED",
  "SPEND_LISTING_HIGHLIGHT",
  "SPEND_PROFILE_BOOST",
  "SPEND_FEED_BOOST",
  "ADMIN_ADJUSTMENT"
]);
export type CoinTxKindT = z.infer<typeof CoinTxKindEnum>;

export const COIN_TX_LABELS: Record<CoinTxKindT, string> = {
  PROFILE_COMPLETED: "Profil vollständig",
  LISTING_ACTIVATED: "Inserat aktiviert",
  SELLER_CONTACTED: "Verkäufer hat geantwortet",
  DAILY_LOGIN: "Täglicher Login",
  REFERRAL_BROKER_ONBOARDED: "Geworbener Makler aktiviert",
  SPEND_LISTING_HIGHLIGHT: "Inserat hervorgehoben",
  SPEND_PROFILE_BOOST: "Profil-Boost gebucht",
  SPEND_FEED_BOOST: "Feed-Boost gebucht",
  ADMIN_ADJUSTMENT: "Manuelle Korrektur"
};

export const SpendKindEnum = z.enum([
  "SPEND_LISTING_HIGHLIGHT",
  "SPEND_PROFILE_BOOST",
  "SPEND_FEED_BOOST"
]);
export type SpendKindT = z.infer<typeof SpendKindEnum>;

export const EarnKindEnum = z.enum([
  "PROFILE_COMPLETED",
  "LISTING_ACTIVATED",
  "SELLER_CONTACTED",
  "DAILY_LOGIN",
  "REFERRAL_BROKER_ONBOARDED"
]);
export type EarnKindT = z.infer<typeof EarnKindEnum>;

export const CoinTransactionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  userId: z.string(),
  kind: CoinTxKindEnum,
  amount: z.number(),
  refId: z.string().nullable().optional(),
  note: z.string().nullable().optional()
});
export type CoinTransactionT = z.infer<typeof CoinTransactionSchema>;

export const CoinSpendSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  userId: z.string(),
  kind: CoinTxKindEnum,
  targetId: z.string().nullable().optional(),
  validUntil: z.string()
});
export type CoinSpendT = z.infer<typeof CoinSpendSchema>;

export const SpendCostSchema = z.object({
  coins: z.number(),
  days: z.number()
});

export const CoinsViewSchema = z.object({
  balance: z.number(),
  isEarlyBird: z.boolean(),
  role: UserRoleEnum,
  multiplier: z.number(),
  transactions: z.array(CoinTransactionSchema),
  activeSpends: z.array(CoinSpendSchema),
  earnAmounts: z.record(EarnKindEnum, z.number()),
  spendCosts: z.record(SpendKindEnum, SpendCostSchema),
  earlyBirdLimit: z.number()
});
export type CoinsViewT = z.infer<typeof CoinsViewSchema>;

export const SpendResultSchema = z.object({
  ok: z.literal(true),
  spent: z.number(),
  newBalance: z.number(),
  validUntil: z.string(),
  spendId: z.string(),
  kind: SpendKindEnum
});
export type SpendResultT = z.infer<typeof SpendResultSchema>;

// --- Admin (Phase H8) ------------------------------------------

const AdminUserMiniSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().optional(),
  role: UserRoleEnum,
  coinsBalance: z.number().optional(),
  isEarlyBird: z.boolean().optional()
});

export const AdminCoinsOverviewSchema = z.object({
  totalUsers: z.number(),
  earlyBirdsActive: z.number(),
  earlyBirdLimit: z.number(),
  coinsInCirculation: z.number(),
  avgBalance: z.number(),
  activeSpendsCount: z.number(),
  topEarners: z.array(AdminUserMiniSchema),
  topSpenders: z.array(
    z.object({
      user: AdminUserMiniSchema.nullable(),
      spent: z.number()
    })
  ),
  sumsByKind: z.array(
    z.object({
      kind: CoinTxKindEnum,
      total: z.number(),
      count: z.number()
    })
  )
});
export type AdminCoinsOverviewT = z.infer<typeof AdminCoinsOverviewSchema>;

export const AdminCoinsTransactionsSchema = z.object({
  transactions: z.array(
    CoinTransactionSchema.extend({
      user: AdminUserMiniSchema
    })
  ),
  limit: z.number()
});
export type AdminCoinsTransactionsT = z.infer<typeof AdminCoinsTransactionsSchema>;

export const AdminCoinsActiveSpendsSchema = z.array(
  CoinSpendSchema.extend({
    user: AdminUserMiniSchema,
    listing: z
      .object({
        id: z.string(),
        title: z.string(),
        city: z.string()
      })
      .nullable()
      .optional()
  })
);
export type AdminCoinsActiveSpendsT = z.infer<typeof AdminCoinsActiveSpendsSchema>;

// --- Verkaufsabwicklung (Phase J) ------------------------------

export const SaleStageEnum = z.enum([
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
export type SaleStageT = z.infer<typeof SaleStageEnum>;

export const SALE_STAGE_LABELS: Record<SaleStageT, string> = {
  ANFRAGE_AKZEPTIERT: "Anfrage akzeptiert",
  BESICHTIGUNG: "Besichtigung",
  VERHANDLUNG: "Verhandlung",
  RESERVIERUNG_LOI: "Reservierung / LOI",
  NOTARENTWURF: "Notarentwurf",
  NOTARTERMIN: "Notartermin",
  BEURKUNDET: "Beurkundet",
  AUFLASSUNGSVORMERKUNG: "Auflassungsvormerkung",
  KAUFPREISZAHLUNG: "Kaufpreiszahlung",
  UEBERGABE: "Übergabe",
  EIGENTUMSUMSCHREIBUNG: "Eigentumsumschreibung",
  ABGESCHLOSSEN: "Abgeschlossen",
  ABGEBROCHEN: "Abgebrochen"
};

// Reihenfolge des Standard-Pfads (ohne ABGEBROCHEN — das ist Off-Track).
export const SALE_STAGE_ORDER: SaleStageT[] = [
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
  "ABGESCHLOSSEN"
];

export const SaleDocKindEnum = z.enum([
  "GRUNDBUCH",
  "ENERGIEAUSWEIS",
  "FLURKARTE",
  "WOHNFLAECHENBERECHNUNG",
  "KAUFVERTRAG_ENTWURF",
  "KAUFVERTRAG_BEURKUNDET",
  "VORFAELLIGKEITSSCHREIBEN",
  "AUFLASSUNGSVORMERKUNG",
  "UEBERGABEPROTOKOLL",
  "TEILUNGSERKLAERUNG",
  "EIGENTUEMERVERSAMMLUNG_PROTOKOLL",
  "MIETVERTRAEGE",
  "MAKLERVERTRAG",
  "SONSTIGES"
]);
export type SaleDocKindT = z.infer<typeof SaleDocKindEnum>;

export const SALE_DOC_LABELS: Record<SaleDocKindT, string> = {
  GRUNDBUCH: "Grundbuchauszug",
  ENERGIEAUSWEIS: "Energieausweis",
  FLURKARTE: "Flurkarte / Lageplan",
  WOHNFLAECHENBERECHNUNG: "Wohnflächenberechnung",
  KAUFVERTRAG_ENTWURF: "Kaufvertrag (Entwurf)",
  KAUFVERTRAG_BEURKUNDET: "Kaufvertrag (beurkundet)",
  VORFAELLIGKEITSSCHREIBEN: "Vorfälligkeitsschreiben",
  AUFLASSUNGSVORMERKUNG: "Auflassungsvormerkung",
  UEBERGABEPROTOKOLL: "Übergabeprotokoll",
  TEILUNGSERKLAERUNG: "Teilungserklärung",
  EIGENTUEMERVERSAMMLUNG_PROTOKOLL: "Eigentümerversammlungs-Protokoll",
  MIETVERTRAEGE: "Mietverträge",
  MAKLERVERTRAG: "Maklervertrag",
  SONSTIGES: "Sonstiges"
};

export const SALE_DOC_ORDER: SaleDocKindT[] = [
  "GRUNDBUCH",
  "ENERGIEAUSWEIS",
  "FLURKARTE",
  "WOHNFLAECHENBERECHNUNG",
  "TEILUNGSERKLAERUNG",
  "EIGENTUEMERVERSAMMLUNG_PROTOKOLL",
  "MIETVERTRAEGE",
  "MAKLERVERTRAG",
  "KAUFVERTRAG_ENTWURF",
  "KAUFVERTRAG_BEURKUNDET",
  "AUFLASSUNGSVORMERKUNG",
  "VORFAELLIGKEITSSCHREIBEN",
  "UEBERGABEPROTOKOLL",
  "SONSTIGES"
];

export const SaleDocumentSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  processId: z.string(),
  kind: SaleDocKindEnum,
  url: z.string(),
  filename: z.string(),
  sizeBytes: z.number(),
  uploaderUserId: z.string().nullable().optional()
});
export type SaleDocumentT = z.infer<typeof SaleDocumentSchema>;

export const SaleStageEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  processId: z.string(),
  stage: SaleStageEnum,
  note: z.string().nullable().optional(),
  byUserId: z.string().nullable().optional()
});
export type SaleStageEntryT = z.infer<typeof SaleStageEntrySchema>;

const SaleListingMiniSchema = z.object({
  id: z.string(),
  title: z.string(),
  city: z.string(),
  askingPrice: z.number()
});

const SaleBuyerMiniSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    role: UserRoleEnum.optional()
  })
  .nullable();

// Listen-Element (Übersichtsseite) — schlank
export const SaleProcessListItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  listingId: z.string(),
  inquiryId: z.string().nullable().optional(),
  sellerId: z.string(),
  buyerId: z.string().nullable().optional(),
  currentStage: SaleStageEnum,
  stageEnteredAt: z.string(),
  notes: z.string().nullable().optional(),
  targetClosingDate: z.string().nullable().optional(),
  agreedPrice: z.number().nullable().optional(),
  listing: SaleListingMiniSchema,
  buyer: SaleBuyerMiniSchema,
  _count: z.object({
    documents: z.number(),
    stageLog: z.number()
  })
});
export type SaleProcessListItemT = z.infer<typeof SaleProcessListItemSchema>;

// Detail-Schema -> ganz unten, weil es ListingSchema referenziert
// (Forward-Reference auf Zod-Schema, das weiter unten definiert ist).

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
  tenantSectors: z.array(z.string()).default([]),

  // --- Premium-Listing (Phase G4) ---
  featuredUntil: z.string().nullable().optional()
});
export type ListingT = z.infer<typeof ListingSchema>;

export const MarketplaceListingSchema = ListingSchema.extend({
  owner: z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    role: UserRoleEnum
  }),
  // Phase G4: Marketplace-Response liefert beide Flags ausgeprägt mit
  ownerVerified: z.boolean().optional(),
  featured: z.boolean().optional(),
  // Phase H6: Coin-Sortier-Layer
  coinHighlighted: z.boolean().optional(),
  coinFeedBoosted: z.boolean().optional()
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

// --- Verkäufer-Dashboard: alle Anfragen auf eigenen Listings (Phase J5)
// --- KI-Marktanalyse + Angebotsbewertung (Phase K) -------------

export const SaleSpeedEnum = z.enum(["FAST", "NORMAL", "DIFFICULT"]);
export type SaleSpeedT = z.infer<typeof SaleSpeedEnum>;
export const SALE_SPEED_LABELS: Record<SaleSpeedT, string> = {
  FAST: "Schnell",
  NORMAL: "Normal",
  DIFFICULT: "Eher schwierig"
};

export const DemandLevelEnum = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type DemandLevelT = z.infer<typeof DemandLevelEnum>;
export const DEMAND_LEVEL_LABELS: Record<DemandLevelT, string> = {
  HIGH: "Hoch",
  MEDIUM: "Mittel",
  LOW: "Gering"
};

export const OfferAttractivenessEnum = z.enum([
  "SEHR_ATTRAKTIV",
  "MARKTGERECHT",
  "NIEDRIG",
  "UNREALISTISCH"
]);
export type OfferAttractivenessT = z.infer<typeof OfferAttractivenessEnum>;
export const OFFER_ATTRACTIVENESS_LABELS: Record<OfferAttractivenessT, string> = {
  SEHR_ATTRAKTIV: "Sehr attraktiv",
  MARKTGERECHT: "Marktgerecht",
  NIEDRIG: "Niedrig",
  UNREALISTISCH: "Unrealistisch"
};

export const OfferRecommendationEnum = z.enum([
  "AKZEPTIEREN",
  "GEGENANGEBOT",
  "ABLEHNEN"
]);
export type OfferRecommendationT = z.infer<typeof OfferRecommendationEnum>;
export const OFFER_RECOMMENDATION_LABELS: Record<OfferRecommendationT, string> = {
  AKZEPTIEREN: "Akzeptieren",
  GEGENANGEBOT: "Gegenangebot",
  ABLEHNEN: "Ablehnen"
};

export const MarketAnalysisSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  listingId: z.string(),
  priceConservative: z.number().nullable().optional(),
  priceFair: z.number().nullable().optional(),
  pricePremium: z.number().nullable().optional(),
  salesSpeed: SaleSpeedEnum.nullable().optional(),
  demand: DemandLevelEnum.nullable().optional(),
  buyerSegments: z.array(z.string()),
  recommendedAskingPrice: z.number().nullable().optional(),
  negotiationRange: z.string().nullable().optional(),
  marketingStrategy: z.string().nullable().optional(),
  risks: z.array(z.string()),
  summary: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  cached: z.boolean().optional()
});
export type MarketAnalysisT = z.infer<typeof MarketAnalysisSchema>;

export const OfferEvaluationSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  listingId: z.string(),
  inquiryId: z.string().nullable().optional(),
  offerAmount: z.number(),
  offerNote: z.string().nullable().optional(),
  attractiveness: OfferAttractivenessEnum.nullable().optional(),
  successProbability: z.number().nullable().optional(),
  recommendation: OfferRecommendationEnum.nullable().optional(),
  counterOffer: z.number().nullable().optional(),
  negotiationHints: z.string().nullable().optional(),
  strategicAdvice: z.string().nullable().optional(),
  model: z.string().nullable().optional()
});
export type OfferEvaluationT = z.infer<typeof OfferEvaluationSchema>;

export const InquiryReceivedSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  listingId: z.string(),
  investorId: z.string(),
  status: InquiryStatusEnum,
  message: z.string(),
  response: z.string().nullable().optional(),
  respondedAt: z.string().nullable().optional(),
  listing: z.object({
    id: z.string(),
    title: z.string(),
    city: z.string()
  }),
  investor: z.object({
    id: z.string(),
    name: z.string().nullable().optional()
  })
});
export type InquiryReceivedT = z.infer<typeof InquiryReceivedSchema>;

// --- Vermietungsplattform (Phase L) ----------------------------

export const RentalStatusEnum = z.enum([
  "DRAFT",
  "AVAILABLE",
  "RESERVED",
  "RENTED",
  "ARCHIVED"
]);
export type RentalStatusT = z.infer<typeof RentalStatusEnum>;
export const RENTAL_STATUS_LABELS: Record<RentalStatusT, string> = {
  DRAFT: "Entwurf",
  AVAILABLE: "Verfügbar",
  RESERVED: "Reserviert",
  RENTED: "Vermietet",
  ARCHIVED: "Archiviert"
};
export const RENTAL_STATUS_ORDER: RentalStatusT[] = [
  "DRAFT",
  "AVAILABLE",
  "RESERVED",
  "RENTED",
  "ARCHIVED"
];

export const ApplicationStatusEnum = z.enum([
  "NEW",
  "REVIEWING",
  "VIEWING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN"
]);
export type ApplicationStatusT = z.infer<typeof ApplicationStatusEnum>;
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatusT, string> = {
  NEW: "Neu",
  REVIEWING: "In Prüfung",
  VIEWING: "Besichtigung",
  ACCEPTED: "Angenommen",
  REJECTED: "Abgelehnt",
  WITHDRAWN: "Zurückgezogen"
};

export const ApplicantRatingEnum = z.enum([
  "SEHR_PASSEND",
  "PASSEND",
  "BEDINGT_PASSEND",
  "EHER_UNPASSEND"
]);
export type ApplicantRatingT = z.infer<typeof ApplicantRatingEnum>;
export const APPLICANT_RATING_LABELS: Record<ApplicantRatingT, string> = {
  SEHR_PASSEND: "Sehr passend",
  PASSEND: "Passend",
  BEDINGT_PASSEND: "Bedingt passend",
  EHER_UNPASSEND: "Eher unpassend"
};

export const RentalUnitImageSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  unitId: z.string(),
  url: z.string(),
  alt: z.string().nullable().optional(),
  sortOrder: z.number()
});
export type RentalUnitImageT = z.infer<typeof RentalUnitImageSchema>;

export const RentalUnitSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ownerId: z.string(),
  title: z.string(),
  description: z.string(),
  city: z.string(),
  district: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  fullAddress: z.string().nullable().optional(),
  rooms: z.number(),
  livingArea: z.number(),
  floor: z.string().nullable().optional(),
  rentCold: z.number(),
  utilities: z.number().nullable().optional(),
  totalRent: z.number().nullable().optional(),
  deposit: z.number().nullable().optional(),
  energyClass: EnergyClassEnum.nullable().optional(),
  energyConsumption: z.number().nullable().optional(),
  energyCarrier: EnergyCarrierEnum.nullable().optional(),
  heatingType: z.string().nullable().optional(),
  status: RentalStatusEnum,
  availableFrom: z.string().nullable().optional(),
  fixedTerm: z.boolean(),
  fixedTermMonths: z.number().nullable().optional(),
  features: z.array(z.string()),
  images: z.array(RentalUnitImageSchema)
});
export type RentalUnitT = z.infer<typeof RentalUnitSchema>;

export const RentalUnitListItemSchema = RentalUnitSchema.extend({
  _count: z
    .object({
      applications: z.number()
    })
    .optional()
});
export type RentalUnitListItemT = z.infer<typeof RentalUnitListItemSchema>;

export const ApplicantEvaluationSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  applicationId: z.string(),
  rating: ApplicantRatingEnum,
  summary: z.string(),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  openQuestions: z.array(z.string()),
  financialStability: z.string().nullable().optional(),
  sizeFit: z.string().nullable().optional(),
  expectedDuration: z.string().nullable().optional(),
  reliability: z.string().nullable().optional(),
  communication: z.string().nullable().optional(),
  recommendViewing: z.boolean(),
  requestDocuments: z.string().nullable().optional(),
  suggestFollowUp: z.string().nullable().optional(),
  rationale: z.string().nullable().optional(),
  model: z.string().nullable().optional()
});
export type ApplicantEvaluationT = z.infer<typeof ApplicantEvaluationSchema>;

export const RentalApplicationSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  unitId: z.string(),
  applicantName: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  monthlyNetIncome: z.number().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  employmentDuration: z.string().nullable().optional(),
  schufaScore: z.string().nullable().optional(),
  householdSize: z.number().nullable().optional(),
  hasPets: z.boolean(),
  petDetails: z.string().nullable().optional(),
  smoker: z.boolean(),
  desiredMoveInDate: z.string().nullable().optional(),
  intendedDuration: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: ApplicationStatusEnum
});
export type RentalApplicationT = z.infer<typeof RentalApplicationSchema>;

// Listen-Element auf der Detail-Page: pro Bewerber ggf. die letzte Evaluation kompakt
export const RentalApplicationListItemSchema = RentalApplicationSchema.extend({
  evaluations: z.array(
    z.object({
      id: z.string(),
      createdAt: z.string(),
      rating: ApplicantRatingEnum,
      recommendViewing: z.boolean(),
      summary: z.string()
    })
  )
});
export type RentalApplicationListItemT = z.infer<typeof RentalApplicationListItemSchema>;

// Detail-Schema: Application mit voller Eval-History
export const RentalApplicationDetailSchema = RentalApplicationSchema.extend({
  unit: RentalUnitSchema,
  evaluations: z.array(ApplicantEvaluationSchema)
});
export type RentalApplicationDetailT = z.infer<typeof RentalApplicationDetailSchema>;

// --- Verkaufsabwicklung — Detail (Phase J) ---------------------
// Detail-Schema steht hier unten, weil es ListingSchema referenziert,
// das weiter oben definiert ist. Forward-Refs in Zod evaluieren sofort
// bei der Object-Erzeugung, nicht erst beim Parse.
export const SaleProcessDetailSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  listingId: z.string(),
  inquiryId: z.string().nullable().optional(),
  sellerId: z.string(),
  buyerId: z.string().nullable().optional(),
  currentStage: SaleStageEnum,
  stageEnteredAt: z.string(),
  notes: z.string().nullable().optional(),
  targetClosingDate: z.string().nullable().optional(),
  agreedPrice: z.number().nullable().optional(),
  listing: ListingSchema,
  buyer: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      role: UserRoleEnum.optional()
    })
    .nullable(),
  inquiry: z
    .object({
      id: z.string(),
      message: z.string(),
      createdAt: z.string()
    })
    .nullable()
    .optional(),
  documents: z.array(SaleDocumentSchema),
  stageLog: z.array(SaleStageEntrySchema)
});
export type SaleProcessDetailT = z.infer<typeof SaleProcessDetailSchema>;

// fetch-Funktionen wurden in lib/api-server.ts ausgelagert (server-only),
// damit Client-Components diese Datei sicher mit-importieren können.
