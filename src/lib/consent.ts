/** Terms of Service + Privacy Policy consent, required before any app access. */
export const CONSENT_VERSION = "2026-07-26";
const PENDING_KEY = "impo-consent-pending";

export function markConsentPending() {
  try {
    localStorage.setItem(PENDING_KEY, CONSENT_VERSION);
  } catch {
    /* ignore */
  }
}

export function readPendingConsent(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingConsent() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}