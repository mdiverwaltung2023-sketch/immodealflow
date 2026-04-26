import Anthropic from "@anthropic-ai/sdk";

export type OfferAIResult = {
  suggested_price: number;
  message: string;
  model?: string;
};

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export async function generateOfferWithClaude(input: {
  price: number;
  rent: number;
  location: string;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY fehlt");
  }

  const client = new Anthropic({ apiKey });

  const system =
    "Du bist ein Immobilien-Investor. Bewerte folgendes Objekt und schlage einen realistischen Kaufpreis unter Marktwert vor. Formuliere zusätzlich eine professionelle, kurze Nachricht an den Verkäufer.";

  const user = `Eingabedaten:
- Preis (Angebot): ${input.price} EUR
- Miete (monatlich): ${input.rent} EUR
- Lage: ${input.location}

Gib ausschließlich ein JSON-Objekt zurück mit genau diesen Keys:
{
  "suggested_price": <number>,
  "message": <string>
}`;

  const msg = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 500,
    temperature: 0.2,
    system,
    messages: [{ role: "user", content: user }]
  });

  const text = msg.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("")
    .trim();

  // Robust: JSON aus ggf. Codefences extrahieren
  const jsonCandidate = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch {
    // Fallback: erstes {...} extrahieren
    const m = jsonCandidate.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Claude-Response enthält kein JSON");
    parsed = JSON.parse(m[0]);
  }

  const obj = parsed as { suggested_price?: unknown; message?: unknown };
  const suggested_price = typeof obj.suggested_price === "number" ? obj.suggested_price : NaN;
  const message = typeof obj.message === "string" ? obj.message : "";

  if (!Number.isFinite(suggested_price) || !message) {
    throw new Error("Claude-JSON ungültig (suggested_price/message)");
  }

  return {
    suggested_price: Math.round(suggested_price),
    message,
    model: msg.model
  } satisfies OfferAIResult;
}

