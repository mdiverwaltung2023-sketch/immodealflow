"use client";

import { upload } from "@vercel/blob/client";

/**
 * upload-document.ts
 *
 * Helper fuer Verkaufs-Dokument-Uploads (DocumentCenter) aus dem Browser.
 *
 * Anders als der alte `/api/upload-document`-Endpoint laeuft die Datei
 * NICHT durch die Vercel-Function — der Browser spricht via
 * `@vercel/blob/client` `upload()` direkt mit dem Blob-Store. Damit
 * entfaellt das harte 4,5-MB-Vercel-Function-Body-Limit (das bei
 * gescannten Grundbuchauszuegen u.ae. zu "Upload-Fehler 413" bzw.
 * "Failed to fetch" gefuehrt hat).
 *
 * Auth/Constraints: Die Route `/api/blob-upload` (handleUpload-Token-
 * Handler) verifiziert den Clerk-User und beschraenkt den Pfad auf
 * `sales/<userId>/...` sowie erlaubte Dateitypen und max. 50 MB.
 *
 * Flow im Aufrufer:
 *   uploadDocumentToBlob(...) -> { url, filename, sizeBytes }
 *     -> POST /me/sale-processes/:id/documents (Backend-Registrierung)
 */

export interface UploadDocumentResult {
  url: string;
  pathname: string;
  filename: string;
  sizeBytes: number;
}

export interface UploadDocumentOptions {
  file: File;
  /** Clerk-User-ID — wird in den Blob-Pfad gehaengt. */
  userId: string;
  /** SaleDocKind — als Ordner-Hint im Pfad. */
  kind: string;
  /** Progress 0..100. */
  onProgress?: (percent: number) => void;
}

/**
 * Laedt ein Dokument per Client-Upload direkt zum Vercel Blob Store hoch.
 * Keine Komprimierung — Dokumente werden 1:1 uebertragen.
 */
export async function uploadDocumentToBlob(
  opts: UploadDocumentOptions
): Promise<UploadDocumentResult> {
  const { file, userId } = opts;

  // Pfad: sales/<userId>/<KIND>/<timestamp>-<safe-name>
  // Die Server-Route validiert den `sales/<userId>/`-Prefix — wir koennen
  // also nicht in fremde Owner-Ordner schreiben.
  const safeKind = (opts.kind || "DOC").replace(/[^A-Z_]/gi, "_").slice(0, 50);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "dokument";
  const pathname = `sales/${userId}/${safeKind}/${Date.now()}-${safeName}`;

  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/blob-upload",
    contentType: file.type || "application/octet-stream",
    onUploadProgress: opts.onProgress
      ? (event) => {
          // event.percentage ist 0..100 in @vercel/blob/client 0.27+
          opts.onProgress?.(Math.round(event.percentage));
        }
      : undefined
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    filename: file.name,
    sizeBytes: file.size
  };
}
