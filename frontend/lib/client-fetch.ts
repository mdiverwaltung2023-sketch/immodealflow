"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

// Fallback auf die Live-Backend-Domain falls NEXT_PUBLIC_API_BASE_URL
// im Vercel-Build nicht gesetzt war. Verhindert, dass relative Pfade
// versehentlich auf die Vercel-Frontend-Domain gehen (-> 404).
const DEFAULT_API_BASE = "https://api.infinityoikos.com";
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE
).replace(/\/+$/, "");

/**
 * Hook für Client-Components, der `fetch` mit dem Clerk-Bearer-Token
 * ergänzt. Identisch zu fetch, nur dass URL-Pfade automatisch an die
 * Backend-Base-URL gehängt werden und Auth-Header gesetzt werden.
 */
export function useApiFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getToken();
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(API_BASE + path, { ...init, headers });
    },
    [getToken]
  );
}
