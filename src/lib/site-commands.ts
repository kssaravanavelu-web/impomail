// Impo can drive the app by emitting control tokens in its reply, e.g. [[go:/inbox]].

export const SITE_ROUTES = [
  "/home",
  "/inbox",
  "/sent",
  "/drafts",
  "/trash",
  "/archive",
  "/compose",
  "/assistant",
  "/profile",
  "/settings",
  "/search",
  "/gmail-status",
  "/connect-gmail",
] as const;

export const CATEGORY_SLUGS = [
  "otp",
  "jobs",
  "social",
  "promotions",
  "updates",
  "personal",
  "payment",
  "travel",
] as const;

export type SiteAction =
  | { type: "go"; path: string }
  | { type: "search"; query: string }
  | { type: "compose"; to?: string; subject?: string; body?: string };

const TOKEN_RX = /\[\[\s*(go|search|compose)\s*:\s*([^\]]*)\]\]/gi;

function normalizePath(raw: string): string | null {
  let p = raw.trim().toLowerCase();
  if (!p) return null;
  if (!p.startsWith("/")) p = `/${p}`;
  if ((SITE_ROUTES as readonly string[]).includes(p)) return p;
  const m = p.match(/^\/category\/([a-z-]+)$/);
  if (m && (CATEGORY_SLUGS as readonly string[]).includes(m[1])) return p;
  if ((CATEGORY_SLUGS as readonly string[]).includes(p.slice(1))) return `/category${p}`;
  return null;
}

/** Extracts control tokens from an assistant reply and returns the clean text. */
export function parseSiteActions(reply: string): { text: string; actions: SiteAction[] } {
  const actions: SiteAction[] = [];
  const text = (reply || "")
    .replace(TOKEN_RX, (_all, kind: string, arg: string) => {
      const k = kind.toLowerCase();
      if (k === "go") {
        const path = normalizePath(arg);
        if (path) actions.push({ type: "go", path });
      } else if (k === "search") {
        const q = arg.trim();
        if (q) actions.push({ type: "search", query: q });
      } else if (k === "compose") {
        const parts = Object.fromEntries(
          arg
            .split("|")
            .map((s) => s.split("="))
            .filter((p) => p.length >= 2)
            .map(([a, ...b]) => [a.trim().toLowerCase(), b.join("=").trim()]),
        ) as Record<string, string>;
        actions.push({ type: "compose", to: parts.to, subject: parts.subject, body: parts.body });
      }
      return "";
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return { text, actions };
}

export function stripSiteActions(reply: string): string {
  return parseSiteActions(reply).text;
}