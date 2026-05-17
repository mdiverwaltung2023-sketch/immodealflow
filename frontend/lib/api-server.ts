import "server-only";

import type { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MeSchema, type Me } from "@/lib/api";

// Fallback auf Live-Backend falls die env-var im Vercel-Build fehlte.
const DEFAULT_API_BASE = "https://api.infinityoikos.com";

function baseUrl() {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE;
  return url.replace(/\/+$/, "");
}

async function authHeaders(): Promise<Record<string, string>> {
  const a = await auth();
  const token = await a.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${baseUrl()}${path}`, { cache: "no-store", headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET ${path} fehlgeschlagen (${res.status}): ${txt.slice(0, 500)}`);
  }
  const json = await res.json();
  return schema.parse(json);
}

export async function apiPost<T>(
  path: string,
  body: unknown | undefined,
  schema: z.ZodType<T>
): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`POST ${path} fehlgeschlagen (${res.status}) ${txt}`);
  }
  const json = await res.json();
  return schema.parse(json);
}

export async function requireOnboardedUser(): Promise<Me> {
  const me = await apiGet("/me", MeSchema);
  if (!me.onboardingCompletedAt) {
    redirect("/onboarding");
  }
  return me;
}
