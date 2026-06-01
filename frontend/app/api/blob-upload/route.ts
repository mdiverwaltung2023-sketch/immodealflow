import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

/**
 * POST /api/blob-upload
 *
 * Token-Handler fuer Vercel Blob CLIENT-side Uploads
 * (@vercel/blob/client -> upload()).
 *
 * Anders als der alte /api/upload-image-Endpoint laeuft die Datei
 * NICHT durch diese Function - der Browser spricht direkt mit dem
 * Blob-Store. Diese Route signiert nur einen Upload-Token (Schritt 1)
 * und bekommt eine Completion-Notification (Schritt 2).
 *
 * Vorteile gegenueber Server-Side-Upload:
 *   - Kein 4-MB-Vercel-Function-Body-Limit (bis 5 GB pro File moeglich)
 *   - Schneller (kein Doppel-Hop ueber Frankfurt)
 *   - Keine Function-Compute-Time waehrend des Uploads
 *
 * Erlaubte Pfade (jeweils auf den authentifizierten Clerk-User gebunden):
 *   - listings/<userId>/...  : Listing-Bilder
 *   - sales/<userId>/...     : Verkaufs-Dokumente (DocumentCenter)
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Upload ist noch nicht aktiviert. Vercel Dashboard -> Project -> Storage -> Blob -> Create Store. Token wird automatisch in den Project-Envs gesetzt."
      },
      { status: 503 }
    );
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      token,
      body,
      request: req,

      // Schritt 1: Vor dem Upload - Server entscheidet ob der Pfad erlaubt
      // ist, und gibt Constraints (Dateityp, max-Groesse, eigenes Token).
      onBeforeGenerateToken: async (pathname) => {
        // Pfad-Constraint: muss in einem der erlaubten Owner-Ordner des
        // authentifizierten Clerk-Users liegen. Verhindert, dass ein User
        // Dateien in einen fremden Owner-Ordner wirft.
        //   - listings/<userId>/...  : Listing-Bilder
        //   - sales/<userId>/...     : Verkaufs-Dokumente (DocumentCenter)
        const imagePrefix = `listings/${userId}/`;
        const docPrefix = `sales/${userId}/`;

        if (pathname.startsWith(imagePrefix)) {
          return {
            allowedContentTypes: [
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/gif",
              "image/avif"
            ],
            // 25 MB harte Obergrenze pro File - Client-seitige Komprimierung
            // sollte typische Smartphone-Bilder ohnehin unter 1 MB druecken.
            maximumSizeInBytes: 25 * 1024 * 1024,
            // Token-Lifetime: 60 Sekunden ab Generierung. Reicht locker
            // fuer den eigentlichen Upload, begrenzt Replay-Risiko.
            validUntil: Date.now() + 60_000,
            // tokenPayload wandert verbatim durch zu onUploadCompleted.
            tokenPayload: JSON.stringify({ userId, scope: "listing" })
          };
        }

        if (pathname.startsWith(docPrefix)) {
          return {
            allowedContentTypes: [
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/heic",
              "text/plain"
            ],
            // Dokumente (gescannte Grundbuchauszuege etc.) koennen deutlich
            // groesser sein als Bilder. Da der Upload direkt zum Blob-Store
            // geht (nicht durch die Vercel-Function), gibt es kein
            // 4,5-MB-Body-Limit mehr - wir setzen 50 MB als Obergrenze.
            maximumSizeInBytes: 50 * 1024 * 1024,
            // Grosse Dateien brauchen ggf. laenger als 60s - 5 Minuten Puffer.
            validUntil: Date.now() + 5 * 60_000,
            tokenPayload: JSON.stringify({ userId, scope: "sale-document" })
          };
        }

        throw new Error(
          `Pfad nicht erlaubt: muss mit "${imagePrefix}" oder "${docPrefix}" beginnen`
        );
      },

      // Schritt 2: Nach erfolgreichem Upload - nur Logging/Audit. Die
      // Registrierung am Listing bzw. SaleProcess macht das Frontend per
      // separatem Backend-Call (hier kennen wir die Ziel-ID nicht).
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const meta = tokenPayload ? JSON.parse(tokenPayload) : null;
          console.log(
            `[blob-upload] uploaded: ${blob.pathname} by user=${meta?.userId ?? "?"}`
          );
        } catch {
          /* leise */
        }
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload-Fehler";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
