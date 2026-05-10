import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY fehlt");
  return new Anthropic({ apiKey });
}

/**
 * Generischer Helper: ruft Claude mit einem einzigen Tool an und zwingt
 * eine strukturierte Antwort. Gibt das `input` des tool_use-Blocks zurück.
 */
async function callWithTool<T>(opts: {
  systemPrompt: string;
  userMessage: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ data: T; model: string }> {
  const client = getClient();
  const msg = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.2,
    system: opts.systemPrompt,
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.inputSchema as Anthropic.Tool.InputSchema
      }
    ],
    tool_choice: { type: "tool", name: opts.toolName },
    messages: [{ role: "user", content: opts.userMessage }]
  });

  const toolUse = msg.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`Claude hat das Tool "${opts.toolName}" nicht aufgerufen`);
  }

  return { data: toolUse.input as T, model: msg.model };
}

// ============================================================
// Use-Case 1: Angebot generieren (vorher freies JSON, jetzt Tool-Use)
// ============================================================

export type OfferAIResult = {
  suggested_price: number;
  message: string;
  model?: string;
};

export async function generateOfferWithClaude(input: {
  price: number;
  rent: number;
  location: string;
}): Promise<OfferAIResult> {
  const { data, model } = await callWithTool<{
    suggested_price: number;
    message: string;
  }>({
    systemPrompt:
      "Du bist ein erfahrener Immobilien-Investor. Bewerte das angebotene Objekt anhand der Eckdaten (Preis, Miete, Lage) und schlage einen realistischen Kaufpreis unter Marktwert vor. Formuliere eine professionelle, kurze Nachricht an den Verkäufer auf Deutsch.",
    userMessage: `Eingabedaten:
- Preis (Angebot): ${input.price} EUR
- Miete (monatlich): ${input.rent} EUR
- Lage: ${input.location}`,
    toolName: "propose_offer",
    toolDescription:
      "Schlage einen Kaufpreis unter Marktwert vor und formuliere eine professionelle Nachricht an den Verkäufer.",
    inputSchema: {
      type: "object",
      properties: {
        suggested_price: {
          type: "number",
          description: "Vorgeschlagener Kaufpreis in EUR (ganze Zahl, unter dem Angebotspreis)"
        },
        message: {
          type: "string",
          description: "Anschreiben an den Verkäufer auf Deutsch, max. 600 Zeichen, professionell und kurz"
        }
      },
      required: ["suggested_price", "message"]
    },
    maxTokens: 600
  });

  if (!Number.isFinite(data.suggested_price) || !data.message) {
    throw new Error("Claude-Tool-Use lieferte ungültige Daten");
  }

  return {
    suggested_price: Math.round(data.suggested_price),
    message: data.message,
    model
  };
}

// ============================================================
// Use-Case 2: Exposé-Text → strukturierte Felder
// ============================================================

export type ExtractedProperty = {
  title: string;
  price: number;
  rent: number;
  location: string;
  size: number;
  confidence?: string;
  notes?: string;
};

export async function extractPropertyFromText(text: string): Promise<ExtractedProperty & { model: string }> {
  const { data, model } = await callWithTool<ExtractedProperty>({
    systemPrompt:
      "Du extrahierst Immobilien-Eckdaten aus Inserats-Texten (Immoscout, Immowelt, eBay-Kleinanzeigen, Exposés). Achte auf deutsche Zahlenformate (1.234,56). Wenn die Kaltmiete nicht angegeben ist (z. B. nur Selbstnutzung), schätze 0. Setze 'confidence' auf 'low', 'medium' oder 'high'. Notes für Auffälligkeiten oder geratene Werte.",
    userMessage: `Hier der Inserat-Text:\n\n${text}`,
    toolName: "extract_property",
    toolDescription:
      "Extrahiert die strukturierten Eckdaten einer Immobilie aus einem Inserats-Text.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Kurzer prägnanter Titel (z. B. '2-Zimmer Wohnung mit Balkon, Berlin Prenzlauer Berg')"
        },
        price: {
          type: "number",
          description: "Kaufpreis in EUR (ganze Zahl, ohne Punkte/Kommata)"
        },
        rent: {
          type: "number",
          description: "Kalt-Miete pro Monat in EUR (ganze Zahl). 0 wenn nicht angegeben."
        },
        location: {
          type: "string",
          description: "Lage so präzise wie möglich, z. B. 'Berlin, Prenzlauer Berg' oder 'München, Schwabing'"
        },
        size: {
          type: "number",
          description: "Wohnfläche in Quadratmetern (Zahl, kann Dezimal sein)"
        },
        confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Wie sicher ist die Extraktion?"
        },
        notes: {
          type: "string",
          description: "Auffälligkeiten oder geratene Werte (z. B. 'Miete nicht angegeben, geschätzt')"
        }
      },
      required: ["title", "price", "rent", "location", "size"]
    },
    maxTokens: 500
  });

  return { ...data, model };
}

// ============================================================
// Use-Case 4: Versteigerungs-Bekanntmachung → strukturierte Felder
// ============================================================

export type ExtractedAuction = {
  title: string;
  caseNumber?: string;
  marketValue?: number;
  auctionDateIso?: string;
  auctionLocation?: string;
  auctionType?: "ZVG" | "DGA" | "SDL" | "KARHAUSEN" | "OTHER";
  address?: string;
  size?: number;
  estimatedRent?: number;
  notes?: string;
};

export async function extractAuctionFromText(text: string): Promise<ExtractedAuction & { model: string }> {
  const { data, model } = await callWithTool<ExtractedAuction>({
    systemPrompt: [
      "Du extrahierst die Eckdaten einer Immobilien-Versteigerung aus einer ZVG-Bekanntmachung, ",
      "einem Auktionskatalog (DGA, SDL, Karhausen) oder ähnlichem Text. ",
      "Achte auf deutsche Datums- und Zahlenformate (1.234.567,89). ",
      "Verkehrswert ist üblicherweise mit 'Verkehrswert' oder 'Wert' beschriftet. ",
      "Termin oft mit 'Versteigerungstermin', 'Termin' oder 'Verhandlungstermin' benannt. ",
      "Wenn die Miete nicht direkt steht aber implizit ableitbar (z. B. Bruttomiete pro Jahr / 12), schätze sie. ",
      "Aktenzeichen sind in der Regel im Format '5 K 123/24' oder ähnlich."
    ].join(""),
    userMessage: `Bekanntmachungs-/Katalog-Text:\n\n${text}`,
    toolName: "extract_auction",
    toolDescription: "Extrahiert die strukturierten Eckdaten einer Immobilien-Versteigerung.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Kurzer prägnanter Titel mit Lage, Objekttyp, m². z. B. '3-Zi-ETW Köln-Ehrenfeld, 78 m² (ZVG)'"
        },
        caseNumber: {
          type: "string",
          description: "Aktenzeichen, z. B. '5 K 123/24'. Leer lassen wenn nicht gefunden."
        },
        marketValue: {
          type: "number",
          description: "Verkehrswert lt. Gutachten in EUR (ganze Zahl, ohne Punkte/Kommata). 0 oder weglassen wenn nicht angegeben."
        },
        auctionDateIso: {
          type: "string",
          description: "Versteigerungstermin im ISO-Format YYYY-MM-DDTHH:MM. Wenn nur Datum bekannt: YYYY-MM-DDT09:00. Leer lassen wenn nicht gefunden."
        },
        auctionLocation: {
          type: "string",
          description: "Amtsgericht oder Online-Plattform, z. B. 'Amtsgericht Köln, Saal 142' oder 'DGA Online'."
        },
        auctionType: {
          type: "string",
          enum: ["ZVG", "DGA", "SDL", "KARHAUSEN", "OTHER"],
          description: "Art der Versteigerung. Default ZVG (Zwangsversteigerung) wenn unklar."
        },
        address: {
          type: "string",
          description: "Genaue Adresse oder Lagebezeichnung des Objekts."
        },
        size: {
          type: "number",
          description: "Wohnfläche in m² (Zahl, kann Dezimal sein)."
        },
        estimatedRent: {
          type: "number",
          description: "Geschätzte oder genannte Kalt-Miete pro Monat in EUR. 0 wenn unklar."
        },
        notes: {
          type: "string",
          description: "Auffälligkeiten: Vermietungssituation, bekannte Belastungen, Renovierungsbedarf, Sondereigentum, etc."
        }
      },
      required: ["title"]
    },
    maxTokens: 800
  });

  return { ...data, model };
}

// ============================================================
// Use-Case 4b: Liste mehrerer Versteigerungen (Katalog-/Übersichtsseite)
// ============================================================

export type ExtractedAuctionListItem = {
  title: string;
  caseNumber?: string;
  marketValue?: number;
  auctionDateIso?: string;
  auctionLocation?: string;
  address?: string;
  size?: number;
  estimatedRent?: number;
  detailUrl?: string;
  notes?: string;
};

export async function extractAuctionListFromText(
  text: string
): Promise<{ items: ExtractedAuctionListItem[]; model: string }> {
  const { data, model } = await callWithTool<{ items: ExtractedAuctionListItem[] }>({
    systemPrompt: [
      "Du extrahierst eine Liste von Immobilien-Versteigerungen aus einer Übersichts-/Katalogseite ",
      "(z. B. DGA, SDL, Karhausen oder zvg-portal Listenansicht). ",
      "Jeder Eintrag muss mindestens einen aussagekräftigen Titel haben. ",
      "Verkehrswert/Mindestpreis, Termin und Adresse extrahierst du, wenn vorhanden. ",
      "Wenn Detail-Links als URL erkennbar sind (relative Links absolut machen), gib sie als detailUrl an. ",
      "Achte auf deutsche Datums- und Zahlenformate. ",
      "Liefere maximal 50 Einträge."
    ].join(""),
    userMessage: `Übersichts-/Katalogseite (Text):\n\n${text}`,
    toolName: "extract_auction_list",
    toolDescription: "Extrahiert eine Liste mehrerer Versteigerungs-Einträge aus einer Übersichtsseite.",
    inputSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          maxItems: 50,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Kurzer Titel des Objekts" },
              caseNumber: { type: "string", description: "Aktenzeichen, falls vorhanden" },
              marketValue: { type: "number", description: "Verkehrswert oder Mindestpreis in EUR" },
              auctionDateIso: { type: "string", description: "Termin im ISO-Format YYYY-MM-DDTHH:MM" },
              auctionLocation: { type: "string", description: "Amtsgericht oder Plattform" },
              address: { type: "string", description: "Adresse oder Lagebezeichnung" },
              size: { type: "number", description: "Wohnfläche in m²" },
              estimatedRent: { type: "number", description: "Kalt-Miete in EUR/Monat, falls angegeben" },
              detailUrl: { type: "string", description: "Absolute URL zur Detail-Ansicht" },
              notes: { type: "string", description: "Auffälligkeiten" }
            },
            required: ["title"]
          }
        }
      },
      required: ["items"]
    },
    maxTokens: 4000
  });

  return { items: data.items ?? [], model };
}

// ============================================================
// Use-Case 5: KI-Marktanalyse fuer ein Listing (Phase K — TEIL 1)
// ============================================================

/**
 * Strukturiertes Listing-Datenpaket fuer die KI. Wir packen alle
 * relevanten Felder rein, damit Claude eine fundierte Einschaetzung
 * abgeben kann. Der Prompt orientiert sich an Marcos Original-Vorgabe
 * (Verkaeufer-Sicht, datenbasiert, keine absoluten Wahrheiten).
 */
export type ListingMarketInput = {
  title: string;
  description?: string | null;
  propertyType: string;
  askingPrice: number;
  totalArea: number;
  totalRent?: number | null;
  city: string;
  district?: string | null;
  postalCode?: string | null;

  yearBuilt?: number | null;
  lastRenovation?: number | null;
  condition?: string | null;
  livingArea?: number | null;
  commercialArea?: number | null;
  landArea?: number | null;
  floors?: number | null;

  residentialUnits?: number | null;
  commercialUnits?: number | null;

  energyClass?: string | null;
  energyConsumption?: number | null;
  energyCarrier?: string | null;
  heatingType?: string | null;

  actualRent?: number | null;
  vacancyRate?: number | null;
  waltMonths?: number | null;
  rentIndexed?: boolean | null;
  rentEscalation?: boolean | null;

  modernizationBacklog?: number | null;
  gegCompliant?: boolean | null;

  commissionRate?: number | null;
  commissionFree?: boolean | null;

  features?: string[];
  highlights?: string[];
  tenantSectors?: string[];
  anchorTenant?: string | null;
};

export type MarketAnalysisResult = {
  priceConservative: number;
  priceFair: number;
  pricePremium: number;
  salesSpeed: "FAST" | "NORMAL" | "DIFFICULT";
  demand: "HIGH" | "MEDIUM" | "LOW";
  buyerSegments: string[];
  recommendedAskingPrice: number;
  negotiationRange: string;
  marketingStrategy: string;
  risks: string[];
  summary: string;
};

const MARKET_ANALYSIS_SYSTEM = [
  "Du bist ein KI-gestuetzter Immobilienanalyst und Verkaufsberater fuer den deutschen Immobilienmarkt.",
  "Ziel: Erstelle aus den Immobiliendaten eine realistische Preiseinschaetzung, Verkaufsstrategien,",
  "Kaeuferzielgruppen und konkrete Handlungsempfehlungen fuer den Verkaeufer.",
  "WICHTIG: Keine absoluten Wahrheiten. Immer als datenbasierte Einschaetzung formulieren.",
  "Verstaendlich und professionell. Fokus auf Verkaeufersicht. Antworte ausschliesslich auf Deutsch."
].join(" ");

function listingDataAsBriefing(l: ListingMarketInput): string {
  const lines: string[] = [];
  lines.push(`Titel: ${l.title}`);
  lines.push(`Typ: ${l.propertyType}`);
  lines.push(`Lage: ${[l.city, l.district, l.postalCode].filter(Boolean).join(" / ")}`);
  lines.push(`Kaufpreis (inseriert): ${l.askingPrice} EUR`);
  lines.push(`Gesamtflaeche: ${l.totalArea} m²`);
  if (l.totalRent != null) lines.push(`Soll-Miete pro Monat: ${l.totalRent} EUR`);
  if (l.actualRent != null) lines.push(`Ist-Miete pro Monat: ${l.actualRent} EUR`);
  if (l.vacancyRate != null) lines.push(`Leerstand: ${(l.vacancyRate * 100).toFixed(1)} %`);
  if (l.waltMonths != null) lines.push(`WALT (gewichtete Restmietdauer): ${l.waltMonths} Monate`);
  if (l.rentIndexed) lines.push(`Indexmiete: ja`);
  if (l.rentEscalation) lines.push(`Staffelmiete: ja`);
  if (l.yearBuilt) lines.push(`Baujahr: ${l.yearBuilt}`);
  if (l.lastRenovation) lines.push(`Letzte Sanierung: ${l.lastRenovation}`);
  if (l.condition) lines.push(`Zustand: ${l.condition}`);
  if (l.livingArea != null) lines.push(`Wohnflaeche: ${l.livingArea} m²`);
  if (l.commercialArea != null) lines.push(`Gewerbeflaeche: ${l.commercialArea} m²`);
  if (l.landArea != null) lines.push(`Grundstuecksflaeche: ${l.landArea} m²`);
  if (l.floors != null) lines.push(`Etagen: ${l.floors}`);
  if (l.residentialUnits != null) lines.push(`Wohneinheiten: ${l.residentialUnits}`);
  if (l.commercialUnits != null) lines.push(`Gewerbeeinheiten: ${l.commercialUnits}`);
  if (l.energyClass) lines.push(`Energieklasse: ${l.energyClass}`);
  if (l.energyConsumption != null) lines.push(`Endenergie: ${l.energyConsumption} kWh/m²a`);
  if (l.energyCarrier) lines.push(`Energietraeger: ${l.energyCarrier}`);
  if (l.heatingType) lines.push(`Heizung: ${l.heatingType}`);
  if (l.modernizationBacklog != null && l.modernizationBacklog > 0) {
    lines.push(`Modernisierungsstau: ${l.modernizationBacklog} EUR`);
  }
  if (l.gegCompliant === true) lines.push(`GEG-konform: ja`);
  if (l.gegCompliant === false) lines.push(`GEG-konform: nein`);
  if (l.anchorTenant) lines.push(`Hauptmieter: ${l.anchorTenant}`);
  if (l.tenantSectors && l.tenantSectors.length > 0) {
    lines.push(`Mieter-Branchen: ${l.tenantSectors.join(", ")}`);
  }
  if (l.commissionFree === true) lines.push(`Provisionsfrei: ja`);
  else if (l.commissionRate != null) lines.push(`Provision: ${l.commissionRate} %`);
  if (l.features && l.features.length > 0) {
    lines.push(`Ausstattung: ${l.features.join(", ")}`);
  }
  if (l.highlights && l.highlights.length > 0) {
    lines.push(`Highlights: ${l.highlights.join(", ")}`);
  }
  if (l.description) {
    lines.push("");
    lines.push(`Beschreibung:\n${l.description.slice(0, 1500)}`);
  }
  return lines.join("\n");
}

export async function analyzeListingMarket(
  listing: ListingMarketInput
): Promise<MarketAnalysisResult & { model: string; rawJson: unknown }> {
  const briefing = listingDataAsBriefing(listing);
  const { data, model } = await callWithTool<MarketAnalysisResult>({
    systemPrompt: MARKET_ANALYSIS_SYSTEM,
    userMessage: [
      "PROPERTY_DATA:",
      briefing,
      "",
      "Erstelle:",
      "1. Marktpreis-Spanne (priceConservative / priceFair / pricePremium in EUR)",
      "2. Verkaufsgeschwindigkeit (salesSpeed: FAST/NORMAL/DIFFICULT)",
      "3. Nachfrageeinschaetzung (demand: HIGH/MEDIUM/LOW)",
      "4. Kaeufer-Zielgruppen (buyerSegments — beliebige Mischungen wie 'Eigennutzer', 'Kapitalanleger', 'Familien', 'Senioren', 'Single-Haushalte', 'Bautraeger', max 6 Eintraege)",
      "5. Verkaufsstrategie: empfohlener Angebotspreis (recommendedAskingPrice in EUR), Verhandlungsspielraum (negotiationRange als Text), Vermarktungsstrategie (marketingStrategy als 1-3 Saetze)",
      "6. Risiken (risks): max 6 Stichpunkte zu Preis-, Lage-, Zustand- oder Marktproblemen",
      "7. Zusammenfassung (summary): max 5 Saetze, klar und verkaufsorientiert"
    ].join("\n"),
    toolName: "analyze_listing_market",
    toolDescription:
      "Liefert eine strukturierte Marktanalyse fuer ein Verkaufs-Inserat (TEIL 1 der KI-Bewertung).",
    inputSchema: {
      type: "object",
      properties: {
        priceConservative: {
          type: "number",
          description: "Konservative Preisspanne — was sicher zu erzielen ist (EUR, ganze Zahl)"
        },
        priceFair: {
          type: "number",
          description: "Marktgerechter Preis (EUR, ganze Zahl)"
        },
        pricePremium: {
          type: "number",
          description: "Premium-/Wunschpreis bei optimaler Vermarktung (EUR, ganze Zahl)"
        },
        salesSpeed: {
          type: "string",
          enum: ["FAST", "NORMAL", "DIFFICULT"],
          description: "Erwartete Verkaufsgeschwindigkeit"
        },
        demand: {
          type: "string",
          enum: ["HIGH", "MEDIUM", "LOW"],
          description: "Geschaetzte Nachfrage in der Lage/Klasse"
        },
        buyerSegments: {
          type: "array",
          maxItems: 6,
          items: { type: "string" },
          description: "Wahrscheinliche Kaeufer-Zielgruppen (deutsche Begriffe)"
        },
        recommendedAskingPrice: {
          type: "number",
          description: "Empfohlener Angebotspreis fuer die Vermarktung (EUR, ganze Zahl)"
        },
        negotiationRange: {
          type: "string",
          description: "Beschreibung des Verhandlungsspielraums (z. B. 'ca. 5-8 % nach unten realistisch')"
        },
        marketingStrategy: {
          type: "string",
          description: "Empfohlene Vermarktungsstrategie in 1-3 Saetzen"
        },
        risks: {
          type: "array",
          maxItems: 6,
          items: { type: "string" },
          description: "Konkrete Preis-, Lage-, Zustands- oder Marktrisiken"
        },
        summary: {
          type: "string",
          description: "Zusammenfassung in maximal 5 Saetzen, verkaeuferorientiert"
        }
      },
      required: [
        "priceConservative",
        "priceFair",
        "pricePremium",
        "salesSpeed",
        "demand",
        "buyerSegments",
        "recommendedAskingPrice",
        "negotiationRange",
        "marketingStrategy",
        "risks",
        "summary"
      ]
    },
    maxTokens: 1600,
    temperature: 0.3
  });

  return {
    ...data,
    priceConservative: Math.round(data.priceConservative),
    priceFair: Math.round(data.priceFair),
    pricePremium: Math.round(data.pricePremium),
    recommendedAskingPrice: Math.round(data.recommendedAskingPrice),
    model,
    rawJson: data
  };
}

// ============================================================
// Use-Case 6: KI-Bewertung eines Kaeufer-Angebots (Phase K — TEIL 2)
// ============================================================

export type OfferEvaluationResult = {
  attractiveness: "SEHR_ATTRAKTIV" | "MARKTGERECHT" | "NIEDRIG" | "UNREALISTISCH";
  successProbability: number; // 0..1
  recommendation: "AKZEPTIEREN" | "GEGENANGEBOT" | "ABLEHNEN";
  counterOffer?: number; // EUR
  negotiationHints: string;
  strategicAdvice: string;
};

const OFFER_EVAL_SYSTEM = [
  "Du bist ein KI-gestuetzter Immobilienanalyst und Verkaufsberater fuer den deutschen Immobilienmarkt.",
  "Bewerte einen konkreten Kaeufer-Preisvorschlag fuer ein Verkaufs-Inserat.",
  "WICHTIG: Keine absoluten Wahrheiten oder rechtlich belastbaren Aussagen.",
  "Immer als datenbasierte Einschaetzung formulieren. Antworte ausschliesslich auf Deutsch.",
  "Fokus auf Verkaeufersicht — was ist strategisch klug?"
].join(" ");

export async function evaluateBuyerOffer(input: {
  listing: ListingMarketInput;
  offerAmount: number;
  offerNote?: string | null;
  /**
   * Optional: bisherige MarketAnalysis-Werte als zusaetzlicher Kontext,
   * damit Claude konsistent bewertet (z. B. counterOffer im Rahmen der
   * empfohlenen Spanne).
   */
  existingAnalysis?: Pick<
    MarketAnalysisResult,
    "priceConservative" | "priceFair" | "pricePremium" | "recommendedAskingPrice"
  > | null;
}): Promise<OfferEvaluationResult & { model: string; rawJson: unknown }> {
  const briefing = listingDataAsBriefing(input.listing);
  const analysisLines: string[] = [];
  if (input.existingAnalysis) {
    analysisLines.push("Bestehende KI-Marktanalyse:");
    analysisLines.push(`- Konservativ: ${input.existingAnalysis.priceConservative} EUR`);
    analysisLines.push(`- Marktgerecht: ${input.existingAnalysis.priceFair} EUR`);
    analysisLines.push(`- Premium: ${input.existingAnalysis.pricePremium} EUR`);
    analysisLines.push(
      `- Empfohlener Angebotspreis: ${input.existingAnalysis.recommendedAskingPrice} EUR`
    );
  }

  const { data, model } = await callWithTool<OfferEvaluationResult>({
    systemPrompt: OFFER_EVAL_SYSTEM,
    userMessage: [
      "PROPERTY_DATA:",
      briefing,
      "",
      ...(analysisLines.length > 0 ? [...analysisLines, ""] : []),
      `BUYER_OFFER (Kaeufer-Preisvorschlag): ${input.offerAmount} EUR`,
      input.offerNote ? `BUYER_NOTE: ${input.offerNote}` : "",
      "",
      "Analysiere:",
      "1. Wie attraktiv ist das Angebot? (attractiveness: SEHR_ATTRAKTIV/MARKTGERECHT/NIEDRIG/UNREALISTISCH)",
      "2. Wahrscheinlichkeit eines erfolgreichen Verkaufs zu diesem Preis (successProbability als Wert zwischen 0 und 1)",
      "3. Einschaetzung (recommendation: AKZEPTIEREN/GEGENANGEBOT/ABLEHNEN)",
      "4. Konkrete Handlungsempfehlung: counterOffer (moeglicher Gegenpreis in EUR, falls sinnvoll), negotiationHints (Verhandlungshinweise), strategicAdvice (uebergeordnete strategische Empfehlung)"
    ]
      .filter(Boolean)
      .join("\n"),
    toolName: "evaluate_buyer_offer",
    toolDescription:
      "Bewertet einen konkreten Kaeufer-Preisvorschlag aus Verkaeufer-Sicht (TEIL 2 der KI-Bewertung).",
    inputSchema: {
      type: "object",
      properties: {
        attractiveness: {
          type: "string",
          enum: ["SEHR_ATTRAKTIV", "MARKTGERECHT", "NIEDRIG", "UNREALISTISCH"],
          description: "Wie attraktiv ist das Angebot fuer den Verkaeufer?"
        },
        successProbability: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Geschaetzte Wahrscheinlichkeit, dass der Verkauf zu diesem Preis erfolgreich abgeschlossen werden kann (0 bis 1)"
        },
        recommendation: {
          type: "string",
          enum: ["AKZEPTIEREN", "GEGENANGEBOT", "ABLEHNEN"],
          description: "Konkrete Handlungsempfehlung"
        },
        counterOffer: {
          type: "number",
          description: "Optional: konkreter Gegenpreis-Vorschlag in EUR (nur wenn recommendation = GEGENANGEBOT). 0 oder weglassen wenn nicht relevant."
        },
        negotiationHints: {
          type: "string",
          description: "Verhandlungshinweise — konkrete Argumente und Punkte fuer das naechste Gespraech (max. 4 Saetze)"
        },
        strategicAdvice: {
          type: "string",
          description: "Strategische Empfehlung — was bedeutet das Angebot im Gesamtkontext (max. 3 Saetze)"
        }
      },
      required: [
        "attractiveness",
        "successProbability",
        "recommendation",
        "negotiationHints",
        "strategicAdvice"
      ]
    },
    maxTokens: 1000,
    temperature: 0.25
  });

  return {
    ...data,
    successProbability: Math.max(0, Math.min(1, Number(data.successProbability) || 0)),
    counterOffer:
      data.counterOffer && data.counterOffer > 0
        ? Math.round(data.counterOffer)
        : undefined,
    model,
    rawJson: data
  };
}

// ============================================================
// Use-Case 3: Marktvergleich für eine Lage
// ============================================================

export type MarketComparison = {
  comparable_rent_per_sqm_low: number;
  comparable_rent_per_sqm_high: number;
  comparable_price_per_sqm_low: number;
  comparable_price_per_sqm_high: number;
  rating: "below_market" | "fair" | "above_market";
  rationale: string;
  data_caveat: string;
};

export async function marketComparisonForProperty(input: {
  price: number;
  rent: number;
  location: string;
  size: number;
}): Promise<MarketComparison & { model: string }> {
  const pricePerSqm = input.size > 0 ? Math.round(input.price / input.size) : 0;
  const rentPerSqm = input.size > 0 ? input.rent / input.size : 0;

  const { data, model } = await callWithTool<MarketComparison>({
    systemPrompt:
      "Du bist ein erfahrener Immobilien-Analyst für den deutschen Markt. Schätze realistische Marktwerte (Kaufpreis pro m² und Kaltmiete pro m²) für die angegebene Lage anhand deines Wissens. Sei ehrlich über Unsicherheit (Stand des Wissens, Mikrolage-Variation). Bewerte das konkrete Objekt im Vergleich.",
    userMessage: `Objekt-Daten:
- Lage: ${input.location}
- Wohnfläche: ${input.size} m²
- Kaufpreis: ${input.price} EUR (= ${pricePerSqm} EUR/m²)
- Kalt-Miete: ${input.rent} EUR/Mon (= ${rentPerSqm.toFixed(2)} EUR/m²)

Schätze typische Spannen für diese Lage und bewerte das Angebot.`,
    toolName: "market_comparison",
    toolDescription:
      "Liefert geschätzte Markt-Spannen für Kaufpreis und Miete pro m² in der angegebenen Lage und bewertet das Angebot.",
    inputSchema: {
      type: "object",
      properties: {
        comparable_rent_per_sqm_low: {
          type: "number",
          description: "Untere Spanne typische Kaltmiete in EUR/m²/Monat"
        },
        comparable_rent_per_sqm_high: {
          type: "number",
          description: "Obere Spanne typische Kaltmiete in EUR/m²/Monat"
        },
        comparable_price_per_sqm_low: {
          type: "number",
          description: "Untere Spanne typischer Kaufpreis in EUR/m²"
        },
        comparable_price_per_sqm_high: {
          type: "number",
          description: "Obere Spanne typischer Kaufpreis in EUR/m²"
        },
        rating: {
          type: "string",
          enum: ["below_market", "fair", "above_market"],
          description: "Einordnung des konkreten Angebotspreises"
        },
        rationale: {
          type: "string",
          description: "Kurze deutsche Begründung (1-3 Sätze) für die Bewertung"
        },
        data_caveat: {
          type: "string",
          description: "Hinweis zur Datenqualität (z. B. 'Schätzung auf Basis allgemeiner Marktkenntnis Mitte 2025, keine Echtzeit-Daten')"
        }
      },
      required: [
        "comparable_rent_per_sqm_low",
        "comparable_rent_per_sqm_high",
        "comparable_price_per_sqm_low",
        "comparable_price_per_sqm_high",
        "rating",
        "rationale",
        "data_caveat"
      ]
    },
    maxTokens: 800
  });

  return { ...data, model };
}

// ============================================================
// Use-Case 7: KI-Bewertung eines Mietbewerbers (Phase L2)
// ============================================================
//
// WICHTIG: Anti-Diskriminierungs-Architektur.
// Der System-Prompt verbietet ausdruecklich die Bewertung sensibler
// Merkmale. Das Tool-Schema enthaelt nur organisatorisch/wirtschaftliche
// Felder — Claude kann gar nicht antworten "ich finde Person X
// ungeeignet wegen Y", wo Y ein geschuetztes Merkmal waere.
//
// Wir geben Claude AUCH KEINE sensiblen Merkmale ueber das Schema
// (das Datenmodell RentalApplication erfasst sie gar nicht).

export type RentalUnitInput = {
  title: string;
  city: string;
  district?: string | null;
  rooms: number;
  livingArea: number;
  rentCold: number;
  utilities?: number | null;
  totalRent?: number | null;
  deposit?: number | null;
  features?: string[];
  fixedTerm?: boolean;
  fixedTermMonths?: number | null;
  description?: string | null;
};

export type RentalApplicantInput = {
  applicantName: string;
  /** Haushaltsnetto pro Monat in EUR */
  monthlyNetIncome?: number | null;
  employmentType?: string | null;
  employmentDuration?: string | null;
  schufaScore?: string | null;
  householdSize?: number | null;
  hasPets?: boolean;
  petDetails?: string | null;
  smoker?: boolean;
  desiredMoveInDate?: string | null;
  intendedDuration?: string | null;
  notes?: string | null;
};

export type RentalApplicantEvalResult = {
  rating: "SEHR_PASSEND" | "PASSEND" | "BEDINGT_PASSEND" | "EHER_UNPASSEND";
  summary: string;
  strengths: string[];
  risks: string[];
  openQuestions: string[];
  financialStability: string;
  sizeFit: string;
  expectedDuration: string;
  reliability: string;
  communication: string;
  recommendViewing: boolean;
  requestDocuments?: string;
  suggestFollowUp?: string;
  rationale: string;
};

const RENTAL_EVAL_SYSTEM = [
  "Du bist ein KI-gestuetzter Vermietungsassistent fuer den deutschen Immobilienmarkt.",
  "Deine Aufgabe: Analysiere Mietbewerber neutral, fair und professionell anhand",
  "objektiver Kriterien und unterstuetze Vermieter bei der Auswahl passender Interessenten.",
  "",
  "VERBINDLICHE REGELN — diese duerfen unter keinen Umstaenden verletzt werden:",
  "1. KEINE DISKRIMINIERUNG. Bewerte NICHT aufgrund von:",
  "   - ethnischer Herkunft, Nationalitaet, Hautfarbe, Sprache",
  "   - Religion, Weltanschauung, politischer Ueberzeugung",
  "   - Geschlecht, sexueller Orientierung, Geschlechtsidentitaet",
  "   - Alter (ausgenommen rein wirtschaftliche Implikationen)",
  "   - Behinderung",
  "   - Familienstand, Schwangerschaft, Kinder",
  "2. Fokus AUSSCHLIESSLICH auf objektive, organisatorische und",
  "   wirtschaftliche Faktoren: Einkommen vs. Miete, SCHUFA, Beschaeftigungsart",
  "   und -dauer, Haushaltsgroesse vs. Wohnungsgroesse, gewuenschte Mietdauer,",
  "   Vollstaendigkeit der Angaben, Plausibilitaet.",
  "3. Niemals endgueltige Entscheidungen treffen — die Einschaetzung dient",
  "   nur als organisatorische Unterstuetzung und ersetzt keine persoenliche",
  "   Entscheidung des Vermieters.",
  "4. Immer neutral und sachlich formulieren. Keine wertende Sprache,",
  "   keine Spekulationen ueber Persoenlichkeit.",
  "5. Antworte ausschliesslich auf Deutsch."
].join(" ");

function rentalUnitBriefing(u: RentalUnitInput): string {
  const lines: string[] = [];
  lines.push(`Titel: ${u.title}`);
  lines.push(`Lage: ${[u.city, u.district].filter(Boolean).join(" / ")}`);
  lines.push(`Zimmer: ${u.rooms}`);
  lines.push(`Wohnflaeche: ${u.livingArea} m²`);
  lines.push(`Kaltmiete: ${u.rentCold} EUR/Mon.`);
  if (u.utilities != null) lines.push(`Nebenkosten: ${u.utilities} EUR/Mon.`);
  if (u.totalRent != null) lines.push(`Warmmiete (gesamt): ${u.totalRent} EUR/Mon.`);
  if (u.deposit != null) lines.push(`Kaution: ${u.deposit} EUR`);
  if (u.fixedTerm) {
    lines.push(`Befristet: ja${u.fixedTermMonths ? ` (${u.fixedTermMonths} Monate)` : ""}`);
  }
  if (u.features && u.features.length > 0) {
    lines.push(`Ausstattung: ${u.features.join(", ")}`);
  }
  if (u.description) {
    lines.push("");
    lines.push(`Objekt-Beschreibung:\n${u.description.slice(0, 800)}`);
  }
  return lines.join("\n");
}

function applicantBriefing(a: RentalApplicantInput): string {
  const lines: string[] = [];
  lines.push(`Name (selbst angegeben): ${a.applicantName}`);
  if (a.monthlyNetIncome != null) {
    lines.push(`Haushaltsnetto pro Monat: ${a.monthlyNetIncome} EUR`);
  }
  if (a.employmentType) lines.push(`Beschaeftigungsart: ${a.employmentType}`);
  if (a.employmentDuration) {
    lines.push(`Beschaeftigungsdauer: ${a.employmentDuration}`);
  }
  if (a.schufaScore) lines.push(`SCHUFA: ${a.schufaScore}`);
  if (a.householdSize != null) lines.push(`Haushaltsgroesse: ${a.householdSize} Personen`);
  if (a.hasPets) lines.push(`Haustiere: ja${a.petDetails ? ` (${a.petDetails})` : ""}`);
  else lines.push(`Haustiere: nein`);
  lines.push(`Raucher: ${a.smoker ? "ja" : "nein"}`);
  if (a.desiredMoveInDate) {
    lines.push(`Gewuenschtes Einzugsdatum: ${a.desiredMoveInDate}`);
  }
  if (a.intendedDuration) {
    lines.push(`Geplante Mietdauer: ${a.intendedDuration}`);
  }
  if (a.notes) {
    lines.push("");
    lines.push(`Notizen / freier Text:\n${a.notes.slice(0, 1000)}`);
  }
  return lines.join("\n");
}

export async function evaluateRentalApplicant(input: {
  unit: RentalUnitInput;
  applicant: RentalApplicantInput;
}): Promise<RentalApplicantEvalResult & { model: string; rawJson: unknown }> {
  const { data, model } = await callWithTool<RentalApplicantEvalResult>({
    systemPrompt: RENTAL_EVAL_SYSTEM,
    userMessage: [
      "PROPERTY_DATA:",
      rentalUnitBriefing(input.unit),
      "",
      "APPLICANT_DATA:",
      applicantBriefing(input.applicant),
      "",
      "Bewerte den Bewerber strikt anhand der oben genannten organisatorischen",
      "und wirtschaftlichen Faktoren. Sensible Merkmale tauchen in den Daten",
      "bewusst nicht auf — falls du sie aus dem Namen oder Notizen ableiten",
      "koenntest, IGNORIERE sie ausdruecklich.",
      "",
      "Erstelle:",
      "1. rating: SEHR_PASSEND / PASSEND / BEDINGT_PASSEND / EHER_UNPASSEND",
      "2. summary: 2-4 Saetze, neutrale Bewerber-Zusammenfassung",
      "3. strengths: max 5 Stichpunkte",
      "4. risks: max 5 Stichpunkte (Risiken aus Vermietersicht — nur wirtschaftlich/organisatorisch)",
      "5. openQuestions: max 5 Stichpunkte (was sollte der Vermieter klaeren?)",
      "6. fuenf Faktor-Bewertungen (jeweils 1-2 Saetze):",
      "   - financialStability (Einkommen vs. Miete, SCHUFA, Beschaeftigungs-Stabilitaet)",
      "   - sizeFit (Haushaltsgroesse passt zur Wohnungsgroesse?)",
      "   - expectedDuration (langfristige Mietdauer wahrscheinlich?)",
      "   - reliability (Vollstaendigkeit der Angaben, Plausibilitaet)",
      "   - communication (Klarheit, Strukturiertheit der gemachten Angaben)",
      "7. Handlungsempfehlungen:",
      "   - recommendViewing (Besichtigung empfehlen? boolean)",
      "   - requestDocuments (welche Unterlagen sinnvoll? leer wenn nichts noetig)",
      "   - suggestFollowUp (welche Rueckfrage? leer wenn nicht noetig)",
      "8. rationale: 1-3 Saetze sachliche Begruendung des ratings"
    ].join("\n"),
    toolName: "evaluate_rental_applicant",
    toolDescription:
      "Bewertet einen Mietbewerber strikt anhand objektiver, nicht-diskriminierender Kriterien (Phase L2 — Vermietungsassistent).",
    inputSchema: {
      type: "object",
      properties: {
        rating: {
          type: "string",
          enum: ["SEHR_PASSEND", "PASSEND", "BEDINGT_PASSEND", "EHER_UNPASSEND"],
          description: "Gesamteinschaetzung — passt der Bewerber organisatorisch zur Wohnung?"
        },
        summary: {
          type: "string",
          description: "Neutrale Bewerber-Zusammenfassung in 2-4 Saetzen"
        },
        strengths: {
          type: "array",
          maxItems: 5,
          items: { type: "string" },
          description: "Staerken des Bewerbers (max 5)"
        },
        risks: {
          type: "array",
          maxItems: 5,
          items: { type: "string" },
          description: "Moegliche Risiken aus Vermieter-Sicht (max 5, nur wirtschaftlich/organisatorisch)"
        },
        openQuestions: {
          type: "array",
          maxItems: 5,
          items: { type: "string" },
          description: "Offene Fragen, die der Vermieter klaeren sollte (max 5)"
        },
        financialStability: {
          type: "string",
          description: "Einschaetzung der finanziellen Stabilitaet (1-2 Saetze)"
        },
        sizeFit: {
          type: "string",
          description: "Passung Haushaltsgroesse vs. Wohnungsgroesse (1-2 Saetze)"
        },
        expectedDuration: {
          type: "string",
          description: "Wahrscheinlichkeit langfristiger Mietdauer (1-2 Saetze)"
        },
        reliability: {
          type: "string",
          description: "Organisatorische Zuverlaessigkeit / Vollstaendigkeit der Angaben (1-2 Saetze)"
        },
        communication: {
          type: "string",
          description: "Kommunikationsqualitaet anhand der gemachten Angaben (1-2 Saetze)"
        },
        recommendViewing: {
          type: "boolean",
          description: "Wird eine Besichtigung empfohlen?"
        },
        requestDocuments: {
          type: "string",
          description: "Welche Unterlagen sollte der Vermieter ggf. anfordern? Leerer String wenn nichts Zusaetzliches noetig."
        },
        suggestFollowUp: {
          type: "string",
          description: "Konkrete Rueckfrage(n), falls sinnvoll. Leerer String wenn nicht noetig."
        },
        rationale: {
          type: "string",
          description: "Kurze sachliche Begruendung des ratings (1-3 Saetze)"
        }
      },
      required: [
        "rating",
        "summary",
        "strengths",
        "risks",
        "openQuestions",
        "financialStability",
        "sizeFit",
        "expectedDuration",
        "reliability",
        "communication",
        "recommendViewing",
        "rationale"
      ]
    },
    maxTokens: 1500,
    temperature: 0.2
  });

  return {
    ...data,
    requestDocuments: data.requestDocuments && data.requestDocuments.trim() !== ""
      ? data.requestDocuments
      : undefined,
    suggestFollowUp: data.suggestFollowUp && data.suggestFollowUp.trim() !== ""
      ? data.suggestFollowUp
      : undefined,
    model,
    rawJson: data
  };
}
