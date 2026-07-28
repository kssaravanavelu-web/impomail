import type { Category } from "@/lib/mock-data";

/**
 * Layered classifier — cheapest signal first.
 *   L0 user rules  → L1 sender/header rules  → L2 keyword/regex  → L3 (caller) LLM
 * Only mail that survives L0–L2 returns `null`, i.e. gets sent to the model.
 */

export type MailSignals = {
  from: string;
  subject: string;
  snippet?: string;
  /** raw List-Unsubscribe header (bulk-mail marker) */
  listUnsubscribe?: string;
  /** raw Precedence header (bulk / list / junk) */
  precedence?: string;
};

export type SenderRule = { pattern: string; category: Category };

export function emailOf(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

export function domainOf(from: string): string {
  const e = emailOf(from);
  const i = e.lastIndexOf("@");
  return i === -1 ? "" : e.slice(i + 1);
}

/* ---------------- L0: learned rules from user corrections ---------------- */

export function applySenderRules(from: string, rules: SenderRule[]): Category | null {
  const email = emailOf(from);
  const domain = domainOf(from);
  const hit =
    rules.find((r) => r.pattern.toLowerCase() === email) ??
    rules.find((r) => r.pattern.toLowerCase() === domain) ??
    rules.find((r) => domain.endsWith(`.${r.pattern.toLowerCase()}`));
  return hit ? hit.category : null;
}

/* ---------------- L1: sender / header rules ---------------- */

const DOMAIN_RULES: { re: RegExp; category: Category }[] = [
  { re: /(^|\.)(hdfcbank|icicibank|axisbank|sbi|kotak|yesbank|paypal|stripe|razorpay|payu|billdesk|americanexpress|citibank|chase|wise)\./, category: "payment" },
  { re: /(^|\.)(airtel|jio|vodafoneidea|vi|bsnl|tatasky|tataplay|dishtv|d2h)\./, category: "recharges" },
  { re: /(^|\.)(linkedin|naukri|indeed|internshala|glassdoor|hirist|wellfound|lever|greenhouse|workday(jobs)?)\./, category: "jobs" },
  { re: /(^|\.)(makemytrip|goibibo|irctc|cleartrip|booking|airbnb|expedia|indigo|airindia|vistara|redbus|oyorooms|agoda)\./, category: "travel" },
  { re: /(^|\.)(mailchimp|sendgrid|substack|mailerlite|hubspot|klaviyo)\./, category: "promotions" },
];

const LOCAL_PART_RULES: { re: RegExp; category: Category }[] = [
  { re: /^(otp|verify|verification|noreply-otp|security|auth)@/, category: "otp" },
  { re: /^(billing|invoice|invoices|payments?|receipts?|statements?)@/, category: "payment" },
  { re: /^(careers?|jobs?|recruit(ing|ment)?|talent|hiring)@/, category: "jobs" },
  { re: /^(newsletter|news|deals|offers|marketing|promo)@/, category: "promotions" },
];

function headerLayer(s: MailSignals): Category | null {
  const email = emailOf(s.from);
  const domain = domainOf(s.from);
  for (const r of LOCAL_PART_RULES) if (r.re.test(email)) return r.category;
  for (const r of DOMAIN_RULES) if (r.re.test(`.${domain}`)) return r.category;
  return null;
}

function isBulk(s: MailSignals): boolean {
  return Boolean(s.listUnsubscribe) || /bulk|list|junk/i.test(s.precedence ?? "");
}

/* ---------------- L2: keyword / regex patterns ---------------- */

const CURRENCY = /(₹|rs\.?|inr|\$|usd|€|£)\s?\d/;

function keywordLayer(s: MailSignals): Category | null {
  const text = `${s.subject} ${s.snippet ?? ""}`.toLowerCase();
  const all = `${s.from} ${text}`.toLowerCase();

  // OTP & Security — a 4-8 digit code near an OTP word, or an auth alert
  if (/\b\d{4,8}\b/.test(text) && /(otp|one[- ]time|verification|verify|security code|passcode|2fa|authentication)/.test(text)) return "otp";
  if (/(password reset|reset your password|new sign[- ]?in|login alert|suspicious (sign|login)|two[- ]factor)/.test(text)) return "otp";

  // Recharges & Subscriptions
  if (/(recharge|prepaid|plan activated|auto[- ]?renew|renewal|subscription (renew|expir)|membership (renew|expir)|validity)/.test(all)) return "recharges";

  // Payments & Bills
  if (/(invoice|receipt|payment (received|failed|due)|bill|statement|due date|outstanding|debited|credited|transaction|gst|refund)/.test(all) || (/(paid|amount)/.test(text) && CURRENCY.test(text))) return "payment";

  // Jobs & Internships
  if (/(internship|intern at|application (received|submitted|status)|interview|offer letter|shortlist|hiring|recruiter|job (alert|opening|match)|vacancy)/.test(all)) return "jobs";

  // Travel & Bookings
  if (/(flight|pnr|boarding pass|itinerary|check[- ]in (opens|now)|hotel booking|reservation confirm|train ticket|e[- ]ticket|trip to)/.test(all)) return "travel";

  // Updates — shipping, account & service notices
  if (/(shipped|out for delivery|delivered|tracking|order (update|status)|account (update|notice)|service (status|incident)|maintenance|policy update|terms update|certificate|course|exam|result)/.test(all)) return "updates";

  // Promotions
  if (/(sale|% off|discount|deal|offer ends|newsletter|coupon|limited time|unsubscribe)/.test(all)) return "promotions";

  return null;
}

/* ---------------- pipeline ---------------- */

export type Classification = { category: Category | null; layer: "user" | "sender" | "keyword" | "bulk" | "none" };

export function classify(s: MailSignals, rules: SenderRule[] = []): Classification {
  const learned = applySenderRules(s.from, rules);
  if (learned) return { category: learned, layer: "user" };

  const sender = headerLayer(s);
  if (sender) return { category: sender, layer: "sender" };

  const keyword = keywordLayer(s);
  if (keyword) return { category: keyword, layer: "keyword" };

  // Bulk mail with no other signal is marketing, not personal.
  if (isBulk(s)) return { category: "promotions", layer: "bulk" };

  return { category: null, layer: "none" };
}

/** Convenience: never returns null — defaults ambiguous non-bulk mail to personal. */
export function classifySync(s: MailSignals, rules: SenderRule[] = []): Category {
  return classify(s, rules).category ?? "personal";
}

/** Back-compat helper used by older call sites. */
export function categorizeGmail(from: string, subject: string): Category {
  return classifySync({ from, subject });
}

/* ---------------- priority scoring (sits on top of category) ---------------- */

export function priorityScore(s: MailSignals & { category: Category; date?: string; unread?: boolean }): number {
  const text = `${s.subject} ${s.snippet ?? ""}`.toLowerCase();
  const ageHours = s.date ? Math.max(0, (Date.now() - new Date(s.date).getTime()) / 3.6e6) : 24;
  let score = 0;

  switch (s.category) {
    case "otp":
      // fresh codes matter, stale ones don't
      score = ageHours < 0.25 ? 100 : ageHours < 2 ? 70 : 20;
      break;
    case "payment": {
      score = 60;
      if (/(due (today|tomorrow)|overdue|last date|final reminder|payment failed)/.test(text)) score += 35;
      else if (/(due|reminder)/.test(text)) score += 15;
      break;
    }
    case "jobs":
      score = /(interview|offer letter|shortlist)/.test(text) ? 85 : 50;
      break;
    case "travel":
      score = /(check[- ]in|boarding|departure|cancell?ed|delay)/.test(text) ? 80 : 45;
      break;
    case "recharges":
      score = /(expir|today|tomorrow|low balance)/.test(text) ? 65 : 35;
      break;
    case "personal":
      score = 55;
      break;
    case "updates":
      score = /(out for delivery|delivered|failed)/.test(text) ? 40 : 25;
      break;
    case "promotions":
      score = 5;
      break;
  }

  if (s.unread) score += 8;
  score -= Math.min(20, ageHours / 12); // gentle recency decay
  return Math.round(Math.max(0, score));
}
