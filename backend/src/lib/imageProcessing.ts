/**
 * Phase F.2 + F.3 — Image-Processing fuer Offmarket-Bilder.
 *
 * Lazy-Loading: sharp + openai werden erst beim ERSTEN Aufruf geladen.
 * Dadurch crasht der Container-Start nicht, falls libvips auf dem Host
 * fehlt — nur die Image-Endpoints geben dann einen klaren 503.
 */

import Anthropic from "@anthropic-ai/sdk";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function loadSharp() {
  try {
    const m = await import("sharp");
    return m.default;
  } catch (e) {
    throw new Error(
      "sharp ist nicht ladbar — libvips fehlt auf dem Host? " +
        (e as Error).message
    );
  }
}

async function loadBlobPut() {
  if (!BLOB_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN nicht gesetzt im Backend.");
  }
  const m = await import("@vercel/blob");
  return m.put;
}

async function fetchAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} fehlgeschlagen: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function sniffMediaType(
  buf: Buffer
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "image/gif";
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

export async function generateBlurredVariant(
  originalUrl: string,
  userId: string,
  leadId: string,
  imageId: string
): Promise<string> {
  const sharp = await loadSharp();
  const put = await loadBlobPut();

  const buf = await fetchAsBuffer(originalUrl);
  const blurred = await sharp(buf)
    .resize({ width: 64, withoutEnlargement: false })
    .resize({ width: 1024 })
    .blur(35)
    .modulate({ saturation: 1.25 })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();

  const path = `offmarket/${userId}/${leadId}/${imageId}-blurred.jpg`;
  const blob = await put(path, blurred, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/jpeg",
    token: BLOB_TOKEN!
  });
  return blob.url;
}

export async function generateStylizedVariant(
  originalUrl: string,
  userId: string,
  leadId: string,
  imageId: string
): Promise<{ url: string; caption: string }> {
  if (!ANTHROPIC_KEY) {
    throw new Error("ANTHROPIC_API_KEY fehlt — Stilisierung nicht moeglich.");
  }
  if (!OPENAI_KEY) {
    throw new Error("OPENAI_API_KEY fehlt — KI-Stilisierung nicht moeglich.");
  }
  const sharp = await loadSharp();
  const put = await loadBlobPut();

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
      "- Fassadenfarbe + Material",
      "- Fenster-Stil",
      "- Umgebung/Lichtstimmung",
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

  const finalBuf = await sharp(stylizedBuf)
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const path = `offmarket/${userId}/${leadId}/${imageId}-stylized.jpg`;
  const blob = await put(path, finalBuf, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/jpeg",
    token: BLOB_TOKEN!
  });

  return { url: blob.url, caption: description };
}
