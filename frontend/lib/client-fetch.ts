"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

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
      // JSON-Default falls Body gesetzt aber kein Content-Type
      if (init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(API_BASE + path, { ...init, headers });
    },
    [getToken]
  );
}
