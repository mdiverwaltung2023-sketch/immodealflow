import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";

/**
 * POST /api/upload-document
 *
 * Server-Side-Upload zu Vercel Blob fuer Verkaufs-Dokumente
 * (Phase J3). Akzeptiert PDF, Word, Excel, Bilder bis ~4 MB.
 *
 * Body: multipart/form-data mit Feld "file".
 * Optional Form-Feld "kind": SaleDocKind als Hint fuer den Pathname.
 *
 * Voraussetzung: ENV `BLOB_READ_WRITE_TOKEN` ist gesetzt (gleicher
 * Blob-Store wie die Bilder). Bei Fehlen -> 503.
 *
 * Wird vom Frontend genutzt; die zurueckgegebene URL wird anschliessend
 * an `/me/sale-processes/:id/documents` (Backend) gesendet, um sie
 * am SaleProcess zu registrieren.
 */
const ALLOWED_TYPES = [
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
];

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
          "Dokumenten-Upload ist noch nicht aktiviert. Vercel Dashboard -> Storage -> Blob -> Create Store."
      },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = (form.get("kind") as string | null) ?? "DOC";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file fehlt im Body" }, { status: 400 });
  }

  const MAX = 4 * 1024 * 1024;
  if (file.size > MAX) {
    return NextResponse.json(
      { error: `Datei zu gross (${Math.round(file.size / 1024)} KB, max 4096 KB)` },
      { status: 413 }
    );
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Dateityp ${file.type} nicht zugelassen.` },
      { status: 400 }
    );
  }

  const safeKind = kind.replace(/[^A-Z_]/gi, "_").slice(0, 50);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `sales/${userId}/${safeKind}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, file, {
    access: "public",
    token,
    contentType: file.type || "application/octet-stream"
  });

  return NextResponse.json({
    url: blob.url,
    pathname: blob.pathname,
    filename: file.name,
    sizeBytes: file.size
  });
}
