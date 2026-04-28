// Ambient declaration für den internen Sub-Pfad von pdf-parse.
// @types/pdf-parse declared nur das Hauptmodul "pdf-parse",
// dessen Index-Datei aber bei import einen Test-Run gegen
// ./test/data/05-versions-space.pdf macht und damit in
// Production-Builds ohne Test-Files knallt.
// Daher importieren wir direkt aus pdf-parse/lib/pdf-parse.js
// und shimmen den Type hier.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFParseResult>;
  export default pdfParse;
}
