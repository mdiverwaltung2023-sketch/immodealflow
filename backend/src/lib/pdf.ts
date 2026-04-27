// pdf-parse hat keinen sauberen ESM-Default-Export — der index.js führt beim
// import einen Test gegen ./test/data/05-versions-space.pdf aus, der in
// Production-Builds knallt. Wir importieren daher direkt das interne Modul.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

/**
 * Extrahiert reinen Text aus einem PDF-Base64-String.
 * Der Frontend-Upload schickt das PDF als data-URL (`data:application/pdf;base64,...`)
 * oder roh-Base64. Beides wird hier akzeptiert.
 */
export async function extractTextFromPdfBase64(input: string): Promise<{ text: string; pages: number }> {
  const stripped = input.replace(/^data:application\/pdf;base64,/, "");
  const buf = Buffer.from(stripped, "base64");
  const result = await pdfParse(buf);
  return { text: result.text, pages: result.numpages };
}
