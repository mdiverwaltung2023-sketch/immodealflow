// exposePdf.ts — erzeugt ein druckbares A4-Exposé (PDF) aus einem Listing.
// Reines pdfkit (kein Chromium) => Railway-tauglich. Investoren bekommen damit
// etwas zum Ausdrucken/Vorzeigen. Aufgerufen vom oeffentlichen, nur-ACTIVE
// Endpoint GET /eidos/expose/:id/pdf.
import PDFDocument from "pdfkit";

const INK = "#0e1525";
const ACCENT = "#2f6bff";
const MUTED = "#5b6b86";

function euro(n?: number | null): string | null {
  return n != null ? `${Number(n).toLocaleString("de-DE")} €` : null;
}

export function buildExposePdf(l: any, imageBuffer?: Buffer | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Kopf
    doc.fontSize(22).fillColor(INK).text(String(l.title || "Exposé"));
    const loc = [l.district, l.city].filter(Boolean).join(", ") || l.city || "";
    if (loc) doc.moveDown(0.25).fontSize(12).fillColor(MUTED).text(loc);
    const price = euro(l.askingPrice);
    if (price) doc.moveDown(0.2).fontSize(17).fillColor(ACCENT).text(price);

    // Titelbild (best effort)
    if (imageBuffer) {
      try {
        doc.moveDown(0.6);
        doc.image(imageBuffer, { fit: [495, 280], align: "center" });
      } catch {
        /* Bild ignorieren, falls Format nicht unterstuetzt */
      }
    }

    // Eckdaten
    const rows: Array<[string, string]> = [];
    if (l.propertyType) rows.push(["Objektart", String(l.propertyType)]);
    if (l.totalArea) rows.push(["Gesamtfläche", `${l.totalArea} m²`]);
    if (l.livingArea) rows.push(["Wohnfläche", `${l.livingArea} m²`]);
    if (l.commercialArea) rows.push(["Gewerbefläche", `${l.commercialArea} m²`]);
    if (l.residentialUnits) rows.push(["Wohneinheiten", String(l.residentialUnits)]);
    if (l.commercialUnits) rows.push(["Gewerbeeinheiten", String(l.commercialUnits)]);
    if (l.totalRent) rows.push(["Soll-Miete / Monat", euro(l.totalRent)!]);
    if (l.actualRent) rows.push(["Ist-Miete / Monat", euro(l.actualRent)!]);
    if (l.askingPrice && l.totalRent) {
      const yld = (Number(l.totalRent) * 12) / Number(l.askingPrice) * 100;
      rows.push(["Bruttorendite (ca.)", `${yld.toFixed(1)} %`]);
    }
    if (l.yearBuilt) rows.push(["Baujahr", String(l.yearBuilt)]);
    if (l.energyClass) rows.push(["Energieklasse", String(l.energyClass)]);
    if (l.commissionFree) rows.push(["Provision", "provisionsfrei"]);
    else if (l.commissionRate) rows.push(["Käuferprovision", `${l.commissionRate} %`]);

    if (rows.length) {
      doc.moveDown(0.8).fontSize(14).fillColor(INK).text("Eckdaten");
      doc.moveDown(0.3).fontSize(10).fillColor("#333");
      for (const [k, v] of rows) doc.text(`${k}:  ${v}`);
    }

    if (Array.isArray(l.highlights) && l.highlights.length) {
      doc.moveDown(0.7).fontSize(14).fillColor(INK).text("Highlights");
      doc.moveDown(0.3).fontSize(10).fillColor("#333");
      for (const h of l.highlights) doc.text(`• ${h}`);
    }

    if (Array.isArray(l.features) && l.features.length) {
      doc.moveDown(0.5).fontSize(10).fillColor("#333").text(`Ausstattung: ${l.features.join(", ")}`);
    }

    if (l.description) {
      doc.moveDown(0.7).fontSize(14).fillColor(INK).text("Beschreibung");
      doc.moveDown(0.3).fontSize(10).fillColor("#333").text(String(l.description), { align: "justify" });
    }

    doc.moveDown(1.2).fontSize(8).fillColor("#999").text(
      "Erstellt über InfinityOikos · Angaben ohne Gewähr. Maßgeblich sind die Angaben im notariellen Kaufvertrag.",
      { align: "center" }
    );

    doc.end();
  });
}
