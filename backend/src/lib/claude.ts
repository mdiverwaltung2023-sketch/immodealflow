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
