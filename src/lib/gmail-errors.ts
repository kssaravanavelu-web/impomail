/** Marker for "the Google refresh token expired — the user must re-authorize". */
export const GMAIL_REAUTH_REQUIRED = "GMAIL_REAUTH_REQUIRED";

export function isReauthBody(status: number, body: string): boolean {
  if (status !== 401 && status !== 403) return false;
  const b = body.toLowerCase();
  return (
    b.includes("refresh_token_expired") ||
    b.includes("re-authorize") ||
    b.includes("reauthorize") ||
    b.includes("invalid_grant") ||
    status === 401
  );
}

export function isReauthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.includes(GMAIL_REAUTH_REQUIRED) || /refresh_token_expired|re-?authorize/i.test(msg);
}

export const REAUTH_MESSAGE =
  "Your Google sign-in expired. Reconnect Gmail to keep syncing your mail.";
