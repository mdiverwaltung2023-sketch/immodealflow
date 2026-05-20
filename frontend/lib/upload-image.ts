"use client";

import { upload } from "@vercel/blob/client";

/**
 * upload-image.ts
 *
 * Helper fuer schnelle, robuste Bilder-Uploads aus dem Browser.
 *
 * Was er macht:
 *  1. Komprimiert das Bild client-seitig per Canvas auf max. 2560px lange
 *     Kante, JPEG q=0.85. Verkleinert ein typisches Smartphone-Foto
 *     von 5-8 MB auf 300-700 KB OHNE sichtbaren Qualitaetsverlust.
 *  2. Laedt direkt zum Vercel Blob Store (kein Hop ueber unsere
 *     Vercel-Function), via `@vercel/blob/client` `upload()`. Damit
 *     entfaellt das 4-MB-Function-Body-Limit, und der Upload ist
 *     spuerbar schneller.
 *  3. Liefert Progress-Updates fuer die UI.
 *
 * Auth: Die Route `/api/blob-upload` (handleUpload-Token-Handler)
 * verifiziert den Clerk-User und beschraenkt den Pfad auf
 * `listings/<userId>/...`. Wir muessen daher hier den Pfad korrekt
 * setzen.
 */

export interface CompressOptions {
  /** Maximale lange Bildkante in Pixeln. Default 2560. */
  maxEdge?: number;
  /** JPEG-Qualitaet 0..1. Default 0.85. */
  quality?: number;
}

export interface UploadResult {
  url: string;
  pathname: string;
  originalSize: number;
  finalSize: number;
}

export interface UploadOptions {
  file: File;
  /** Clerk-User-ID — wird in den Blob-Pfad gehaengt. */
  userId: string;
  /** Compression-Optionen. `false` = nicht komprimieren. */
  compress?: CompressOptions | false;
  /** Progress 0..100. */
  onProgress?: (percent: number) => void;
}

/**
 * Verkleinert ein Bild via OffscreenCanvas/Canvas auf
 * `maxEdge` lange Kante und encodiert als JPEG.
 */
async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<Blob> {
  const maxEdge = opts.maxEdge ?? 2560;
  const quality = opts.quality ?? 0.85;

  // createImageBitmap respektiert EXIF-Orientation in modernen Browsern
  // (Chrome, Edge, FF). Safari < 14 nicht — wir akzeptieren das
  // als Edge-Case (Marco testet im Chrome).
  const bitmap = await createImageBitmap(file);

  const longEdge = Math.max(bitmap.width, bitmap.height);
  const ratio = longEdge > maxEdge ? maxEdge / longEdge : 1;
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas 2D-Context nicht verfuegbar");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Komprimierung fehlgeschlagen"));
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Komprimiert ein Bild (optional) und laedt es per Client-Upload zum
 * Vercel Blob Store hoch.
 */
export async function uploadImageToBlob(
  opts: UploadOptions
): Promise<UploadResult> {
  const original = opts.file;
  const originalSize = original.size;

  // 1) Komprimieren — nur wenn es ein Bild ist und der Caller nicht
  //    explizit deaktiviert hat.
  let payload: Blob = original;
  let contentType = original.type || "image/jpeg";
  const shouldCompress =
    opts.compress !== false && original.type.startsWith("image/");

  if (shouldCompress) {
    try {
      const compressed = await compressImage(
        original,
        opts.compress === false ? undefined : opts.compress
      );
      // Nur uebernehmen, wenn die Komprimierung wirklich etwas spart
      // — vermeidet Qualitaetsverlust bei bereits kleinen Bildern.
      if (compressed.size < originalSize) {
        payload = compressed;
        contentType = "image/jpeg";
      }
    } catch {
      // Komprimierung fehlgeschlagen (z.B. seltsames Bildformat)
      // — Original hochladen, das funktioniert immer noch.
    }
  }

  // 2) Pfad: listings/<userId>/<timestamp>-<safe-name>
  //    Die Server-Route validiert, dass der Prefix passt — wir koennen
  //    also nicht in fremde Owner-Ordner schreiben.
  const baseName = original.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
  const finalName =
    payload === original
      ? baseName
      : `${baseName.replace(/\.[^.]+$/, "")}.jpg`;
  const pathname = `listings/${opts.userId}/${Date.now()}-${finalName}`;

  // 3) Direct-to-Blob-Upload via @vercel/blob/client
  const blob = await upload(pathname, payload, {
    access: "public",
    handleUploadUrl: "/api/blob-upload",
    contentType,
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
    originalSize,
    finalSize: payload.size
  };
}
