import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_MODES = new Set(["expose", "auction", "auction-list"]);

export async function POST(req: NextRequest) {
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

  const path =
    mode === "expose" ? "/import/expose"
    : mode === "auction" ? "/import/auction"
    : "/import/auction-list";

  const body: Record<string, unknown> =
    mode === "auction-list"
      ? { text, sourceUrl: sourceUrl || undefined }
      : { text };

  try {
    const r = await fetch(apiBase + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await r.json().catch(() => ({}));

    if (r.status >= 400) {
      const err = data && typeof data.error === "string" ? data.error : `HTTP ${r.status}`;
      return redirectError(req, err);
    }

    if (mode === "expose" || mode === "auction") {
      // erwartet { id: ... } oder Property mit id
      const id = data?.id;
      if (id) return NextResponse.redirect(new URL(`/property/${id}`, req.url), { status: 303 });
      return redirectError(req, "Backend hat keine Property-ID zurückgegeben.");
    }

    // auction-list
    const imported = typeof data?.imported === "number" ? data.imported : 0;
    const skipped = typeof data?.skipped === "number" ? data.skipped : 0;
    const detected = typeof data?.detectedType === "string" ? data.detectedType : "OTHER";
    const params = new URLSearchParams({
      imported: String(imported),
      skipped: String(skipped),
      detected
    });
    return NextResponse.redirect(new URL(`/auctions?${params.toString()}`, req.url), { status: 303 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Netzwerk-Fehler";
    return redirectError(req, msg);
  }
}

function redirectError(req: NextRequest, msg: string) {
  const params = new URLSearchParams({ msg });
  return NextResponse.redirect(new URL(`/bookmarklet/error?${params.toString()}`, req.url), { status: 303 });
}
