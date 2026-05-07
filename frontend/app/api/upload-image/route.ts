import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";

/**
 * POST /api/upload-image
 *
 * Server-Side-Upload zu Vercel Blob.
 * Body: multipart/form-data mit Feld "file" (Bilder bis ~4 MB).
 *
 * Voraussetzung: ENV `BLOB_READ_WRITE_TOKEN` ist gesetzt (in Vercel
 * Dashboard → Project → Storage → Blob aktivieren). Ist es nicht gesetzt,
 * antwortet die Route mit 503, statt zu crashen.
 *
 * Wird vom Frontend genutzt, das die zurückgegebene URL anschließend an
 * `/me/listings/:id/images` (Backend) sendet, um sie am Listing zu registrieren.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Bilder-Upload ist noch nicht aktiviert. Vercel Dashboard → Project → Storage → Blob → Create Store. Token wird automatisch in den Project-Envs gesetzt."
      },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file fehlt im Body" }, { status: 400 });
  }

  // Größe begrenzen — Vercel Serverless hat ~4.5 MB Limit pro Request.
  const MAX = 4 * 1024 * 1024;
  if (file.size > MAX) {
    return NextResponse.json(
      { error: `Datei zu groß (${Math.round(file.size / 1024)} KB, max 4096 KB)` },
      { status: 413 }
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Nur Bilder erlaubt" }, { status: 400 });
  }

  // Pathname: listings/<userId>/<timestamp>-<filename>
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `listings/${userId}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    token,
    contentType: file.type
  });

  return NextResponse.json({ url: blob.url, pathname: blob.pathname });
}
