"use client";

import { useEffect } from "react";

/**
 * Phase H7 — Referral-Link-Capture.
 *
 * Liest beim Mount den ?ref=<userId>-Query aus der URL und persistiert
 * ihn in localStorage. Wird im Root-Layout gemountet, damit jeder Pfad
 * (Landing, /sign-up, /sign-in, ggf. /onboarding) den Wert auffaengt,
 * unabhaengig davon, wo der Werber-Link landet.
 *
 * Der gespeicherte Wert wird vom OnboardingForm beim Submit als
 * referredById ans Backend gereicht und dort einmalig gesetzt — dadurch
 * loescht das OnboardingForm den Key auch nach erfolgreichem Onboarding.
 */
const STORAGE_KEY = "oikos_ref";
const STORAGE_KEY_AT = "oikos_ref_at";
// 30 Tage TTL — laenger ist nicht ehrlich, weil der Werbe-Bezug verblasst.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function ReferralCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (ref && /^[a-z0-9]{12,40}$/i.test(ref)) {
        window.localStorage.setItem(STORAGE_KEY, ref);
        window.localStorage.setItem(STORAGE_KEY_AT, String(Date.now()));
      } else {
        // Stale-TTL-Cleanup: wenn vorhanden aber > 30 Tage alt, weg damit.
        const at = window.localStorage.getItem(STORAGE_KEY_AT);
        if (at && Date.now() - Number(at) > TTL_MS) {
          window.localStorage.removeItem(STORAGE_KEY);
          window.localStorage.removeItem(STORAGE_KEY_AT);
        }
      }
    } catch {
      /* localStorage kann blockiert sein */
    }
  }, []);
  return null;
}

export const REFERRAL_STORAGE_KEY = STORAGE_KEY;
export const REFERRAL_STORAGE_KEY_AT = STORAGE_KEY_AT;

export function readStoredReferral(): string | null {
  try {
    const ref = window.localStorage.getItem(STORAGE_KEY);
    const at = window.localStorage.getItem(STORAGE_KEY_AT);
    if (!ref) return null;
    if (at && Date.now() - Number(at) > TTL_MS) return null;
    return ref;
  } catch {
    return null;
  }
}

export function clearStoredReferral() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEY_AT);
  } catch {
    /* ignore */
  }
}
