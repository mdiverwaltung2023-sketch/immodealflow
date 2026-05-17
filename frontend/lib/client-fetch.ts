"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

// Hard-coded Backend-URL als allerletzte Sicherheitsstufe.
// Reihenfolge:
//   1) NEXT_PUBLIC_API_BASE_URL aus Vercel-Env (wird im Bundle inlined,
//      sofern nicht als "Sensitive" markiert)
//   2) Fallback Hardcoded https://api.infinityoikos.com
//
// Damit kann der Fetch NIEMALS relativ ausgeloest werden ->
// kein "Cannot POST" auf der Frontend-Domain mehr moeglich.
const HARDCODED_API_BASE = "https://api.infinityoikos.com";
const RAW = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_BASE = (RAW && RAW.startsWith("http") ? RAW : HARDCODED_API_BASE)
  .replace(/\/+$/, "");

if (typeof window !== "undefined") {
  // Einmaliger Hinweis in der Browser-Console, falls jemand das pruefen will.
  // eslint-disable-next-line no-console
  console.info("[Infinity Oikos] API base:", API_BASE);
}

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
