import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";

/**
 * POST /api/upload-file
 *
 * Generischer Datei-Upload zu Vercel Blob (Deal-Room-Dokumente).
 * Body: multipart/form-data mit Feld "file" (bis ~4 MB).
 * Safelist gaengiger Dokument-/Bildtypen. Gibt { url, name, size, type } zurueck.
 */
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/zip"
]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Datei-Upload ist noch nicht aktiviert (Vercel Blob fehlt)." },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file fehlt im Body" }, { status: 400 });
  }

  const MAX = 4 * 1024 * 1024;
  if (file.size > MAX) {
    return NextResponse.json(
      { error: `Datei zu groß (${Math.round(file.size / 1024)} KB, max 4096 KB)` },
      { status: 413 }
    );
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Dateityp nicht erlaubt (PDF, Office, Bilder, CSV, TXT, ZIP)." },
      { status: 400 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `coinvest-docs/${userId}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    token,
    contentType: file.type || "application/octet-stream"
  });

  return NextResponse.json({ url: blob.url, name: file.name, size: file.size, type: file.type });
}
