/**
 * Phase F.2 + F.3 — Image-Processing fuer Offmarket-Bilder.
 *
 * Drei Stufen:
 *   1) CSS-Blur (passiert nur im Frontend, kein Backend-Code)
 *   2) Server-side Heavy-Blur via sharp (diese Datei)
 *   3) KI-Stilisierung via Claude (Vision) + OpenAI gpt-image-1
 *
 * Storage: alle drei Varianten landen in Vercel Blob unter
 *   offmarket/<userId>/<leadId>/<imageId>-<variant>.<ext>
 * Variant in {original, blurred, stylized}.
 */

import sharp from "sharp";
import { put } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

function ensureBlob() {
  if (!BLOB_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN nicht gesetzt — Vercel Blob nicht verfuegbar."
    );
  }
}

/**
 * Laedt ein Bild von einer URL als Buffer.
 */
async function fetchAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} fehlgeschlagen: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Erzeugt eine stark verpixelte Version eines Bildes — anonymisierend.
 * Strategie: Aggressive Verkleinerung (kleines Pixelraster) + sigma-Blur
 * + leichte Saturation, damit das Bild "kuenstlerisch" wirkt.
 */
export async function generateBlurredVariant(
  originalUrl: string,
  userId: string,
  leadId: string,
  imageId: string
): Promise<string> {
  ensureBlob();

  const buf = await fetchAsBuffer(originalUrl);

  // Heavy Blur: Pixelize (resize down, dann up) + Gauss-Blur + leicht
  // gesaettigt, damit es "Aquarell-mood" hat.
  const blurred = await sharp(buf)
    .resize({ width: 64, withoutEnlargement: false }) // Pixelize Stufe 1
    .resize({ width: 1024 }) // wieder hoch
    .blur(35) // starker Gauss-Blur
    .modulate({ saturation: 1.25 })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();

  const path = `offmarket/${userId}/${leadId}/${imageId}-blurred.jpg`;
  const blob = await put(path, blurred, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/jpeg",
    token: BLOB_TOKEN
  });
  return blob.url;
}

/**
 * Erzeugt eine KI-stilisierte Aquarell-/Skizze-Variante.
 *
 * Pipeline:
 *   1) Claude (Vision) beschreibt das Bild knapp ("ein 3-stoeckiges
 *      Altbau-MFH mit Erkerfenstern in der Daemmerung, ...")
 *   2) OpenAI gpt-image-1 generiert ein neues Bild im Aquarell-Stil
 *      basierend auf der Beschreibung.
 * Vorteil: das Original verlaesst nie unsere Pipeline, die KI sieht
 * keine identifizierbaren Details.
 */
export async function generateStylizedVariant(
  originalUrl: string,
  userId: string,
  leadId: string,
  imageId: string
): Promise<{ url: string; caption: string }> {
  ensureBlob();
  if (!ANTHROPIC_KEY) {
    throw new Error("ANTHROPIC_API_KEY fehlt — Stilisierung nicht moeglich.");
  }
  if (!OPENAI_KEY) {
    throw new Error("OPENAI_API_KEY fehlt — KI-Stilisierung nicht moeglich.");
  }

  // --- Schritt 1: Claude beschreibt das Bild ANONYMISIERT ---
  const buf = await fetchAsBuffer(originalUrl);
  const base64 = buf.toString("base64");
  const mediaType = sniffMediaType(buf);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const visionResp = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: [
      "Du beschreibst ein Immobilienfoto fuer eine kuenstlerische",
      "Aquarell-Neudarstellung. Beschreibe NUR:",
      "- Bauform, Etagenzahl, Dachform",
      "- Fassadenfarbe + Material (z.B. 'helle Putzfassade')",
      "- Fenster-Stil (z.B. 'Sprossenfenster')",
      "- Umgebung/Lichtstimmung (z.B. 'baumgesaeumte Strasse, Morgenlicht')",
      "Beschreibe NICHT:",
      "- Hausnummern, Schilder, Werbung, Personen, Kennzeichen",
      "- Konkrete Strassennamen oder Ortsangaben",
      "Antworte mit MAX 60 Worten als zusammenhaengender Satz."
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 }
          },
          {
            type: "text",
            text: "Beschreibe dieses Immobilienfoto fuer eine Aquarell-Neudarstellung."
          }
        ]
      }
    ]
  });

  const description = visionResp.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join(" ")
    .trim();

  // --- Schritt 2: OpenAI generiert Aquarell-Bild ---
  const prompt = [
    "Soft watercolor painting of a residential building exterior.",
    "Style: gentle washes, blurred edges, dreamy atmosphere,",
    "muted earth tones with subtle gold accents, no sharp lines,",
    "no readable text, no recognizable details, painterly mood.",
    "Subject details:",
    description
  ].join(" ");

  const imageRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "medium"
    })
  });

  if (!imageRes.ok) {
    const txt = await imageRes.text().catch(() => "");
    throw new Error(
      `OpenAI Image-Generation fehlgeschlagen (${imageRes.status}): ${txt.slice(0, 400)}`
    );
  }
  const json = (await imageRes.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const first = json.data?.[0];
  if (!first) throw new Error("OpenAI lieferte kein Bild zurueck.");

  let stylizedBuf: Buffer;
  if (first.b64_json) {
    stylizedBuf = Buffer.from(first.b64_json, "base64");
  } else if (first.url) {
    stylizedBuf = await fetchAsBuffer(first.url);
  } else {
    throw new Error("OpenAI Response hat weder b64_json noch url.");
  }

  // Komprimieren + uploaden
  const finalBuf = await sharp(stylizedBuf)
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const path = `offmarket/${userId}/${leadId}/${imageId}-stylized.jpg`;
  const blob = await put(path, finalBuf, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/jpeg",
    token: BLOB_TOKEN
  });

  return { url: blob.url, caption: description };
}

function sniffMediaType(
  buf: Buffer
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
  // WebP: "RIFF....WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45
  ) {
    return "image/webp";
  }
  return "image/jpeg";
}
