import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const ALLOWED_MODES = new Set(["expose", "auction", "auction-list"]);

export async function POST(req: NextRequest) {
  // Auth-Check: User muss in DealFlow eingeloggt sein, damit das Bookmarklet
  // die Properties seinem Account zuordnen kann.
  const a = await auth();
  if (!a.userId) {
    return redirectError(req, "Nicht eingeloggt. Bitte erst auf DealFlow anmelden, dann das Bookmarklet erneut klicken.");
  }
  const token = await a.getToken();
  if (!token) {
    return redirectError(req, "Kein Auth-Token verfügbar.");
  }
  const authHeader = { Authorization: `Bearer ${token}` };

  let mode: string;
  let text: string;
  let sourceUrl: string;

  try {
    const fd = await req.formData();
    mode = String(fd.get("mode") || "");
    text = String(fd.get("text") || "");
    sourceUrl = String(fd.get("sourceUrl") || "");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Body konnte nicht gelesen werden";
    return redirectError(req, msg);
  }

  if (!ALLOWED_MODES.has(mode)) {
    return redirectError(req, `Ungültiger Mode: ${mode}`);
  }
  if (text.trim().length < 20) {
    return redirectError(req, "Zu wenig Text (mind. 20 Zeichen).");
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "";
  if (!apiBase) {
    return redirectError(req, "NEXT_PUBLIC_API_BASE_URL nicht gesetzt.");
  }

  try {
    if (mode === "auction") {
      // /import/auction legt schon ein Property an und gibt es zurück
      const r = await fetch(`${apiBase}/import/auction`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text })
      });
      const data = await r.json().catch(() => ({}));
      if (r.status >= 400) return redirectError(req, errorOf(data, r.status));
      const id = data?.id;
      if (!id) return redirectError(req, "Backend hat keine Property-ID zurückgegeben.");
      return NextResponse.redirect(new URL(`/property/${id}`, req.url), { status: 303 });
    }

    if (mode === "auction-list") {
      const r = await fetch(`${apiBase}/import/auction-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ text, sourceUrl: sourceUrl || undefined })
      });
      const data = await r.json().catch(() => ({}));
      if (r.status >= 400) return redirectError(req, errorOf(data, r.status));

      const imported = typeof data?.imported === "number" ? data.imported : 0;
      const skipped = typeof data?.skipped === "number" ? data.skipped : 0;
      const detected = typeof data?.detectedType === "string" ? data.detectedType : "OTHER";
      const params = new URLSearchParams({
        imported: String(imported),
        skipped: String(skipped),
        detected
      });
      return NextResponse.redirect(new URL(`/auctions?${params.toString()}`, req.url), { status: 303 });
    }

    // mode === "expose": zwei Calls: erst extrahieren, dann anlegen
    const extractRes = await fetch(`${apiBase}/import/expose`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ text })
    });
    const extracted = await extractRes.json().catch(() => ({}));
    if (extractRes.status >= 400) return redirectError(req, errorOf(extracted, extractRes.status));

    const title = String(extracted?.title || "").trim();
    const price = Number(extracted?.price || 0);
    const rent = Number(extracted?.rent || 0);
    const location = String(extracted?.location || "").trim();
    const size = Number(extracted?.size || 0);

    if (!title || !location || price <= 0 || size <= 0) {
      return redirectError(
        req,
        `Claude konnte das Inserat nicht ausreichend extrahieren (title="${title}", price=${price}, location="${location}", size=${size}). Versuche manuell unter "Neues Objekt".`
      );
    }

    const createRes = await fetch(`${apiBase}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        title,
        price: Math.round(price),
        rent: Math.max(0, Math.round(rent)),
        location,
        size
      })
    });
    const property = await createRes.json().catch(() => ({}));
    if (createRes.status >= 400) return redirectError(req, errorOf(property, createRes.status));

    const id = property?.id;
    if (!id) return redirectError(req, "Property wurde nicht erfolgreich angelegt.");
    return NextResponse.redirect(new URL(`/property/${id}`, req.url), { status: 303 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Netzwerk-Fehler";
    return redirectError(req, msg);
  }
}

function errorOf(data: unknown, status: number): string {
  if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return `HTTP ${status}`;
}

function redirectError(req: NextRequest, msg: string) {
  const params = new URLSearchParams({ msg });
  return NextResponse.redirect(new URL(`/bookmarklet/error?${params.toString()}`, req.url), { status: 303 });
}
