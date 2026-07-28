import { EXPENSE_CATEGORIES, type FinanceCategory } from "./finance";

/**
 * Gmail search that narrows the mailbox down to money-related mail before any
 * model call. We only ever read email — no Google Pay / UPI app access.
 */
export const FINANCE_SENDERS = [
  "google.com",
  "googlepay",
  "phonepe.com",
  "paytm.com",
  "amazonpay",
  "amazon.in",
  "npci.org.in",
  "sbi.co.in",
  "hdfcbank.net",
  "hdfcbank.com",
  "icicibank.com",
  "axisbank.com",
  "kotak.com",
  "idfcfirstbank.com",
  "federalbank.co.in",
];

const FINANCE_TERMS = [
  "debited",
  "credited",
  "transaction",
  "upi",
  "payment received",
  "payment successful",
  "invoice",
  "receipt",
  "bill",
  "statement",
  "subscription renewed",
  "renewal",
  "emi",
  "due date",
  "salary",
];

export function financeGmailQuery(days = 120): string {
  const from = FINANCE_SENDERS.map((d) => `from:${d}`).join(" OR ");
  const terms = FINANCE_TERMS.map((t) => `"${t}"`).join(" OR ");
  return `newer_than:${days}d (${from} OR ${terms})`;
}

export type ExtractInput = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  hasAttachment?: boolean;
};

export type ExtractedTxn = {
  gmail_message_id: string;
  gmail_thread_id: string;
  direction: "debit" | "credit";
  amount: number;
  currency: string;
  merchant: string | null;
  counterparty: string | null;
  sender: string | null;
  occurred_at: string;
  txn_ref: string | null;
  upi_ref: string | null;
  payment_method: string | null;
  category: FinanceCategory;
  account_hint: string | null;
  has_invoice: boolean;
  confidence: number;
};

export type ExtractedBill = {
  gmail_message_id: string;
  biller: string;
  bill_type: string;
  amount: number;
  currency: string;
  due_date: string | null;
};

export type ExtractedSubscription = {
  name: string;
  merchant: string | null;
  amount: number;
  currency: string;
  cadence: string;
  next_renewal_at: string | null;
};

export type ExtractionResult = {
  transactions: ExtractedTxn[];
  bills: ExtractedBill[];
  subscriptions: ExtractedSubscription[];
};

const SYSTEM = `You extract financial facts from transactional emails. Emails are the ONLY source; never invent data.
Return JSON only, shape:
{"transactions":[{"id":"<gmail id>","direction":"debit|credit","amount":0,"currency":"INR","merchant":null,"counterparty":null,"occurred_at":"ISO8601","txn_ref":null,"upi_ref":null,"payment_method":"upi|card|netbanking|wallet|cash|other","category":"<one of list>","account_hint":null,"has_invoice":false,"confidence":0.0}],
 "bills":[{"id":"<gmail id>","biller":"","bill_type":"electricity|gas|water|broadband|mobile|insurance|credit_card|emi|other","amount":0,"currency":"INR","due_date":"YYYY-MM-DD"}],
 "subscriptions":[{"name":"","merchant":null,"amount":0,"currency":"INR","cadence":"monthly|yearly|weekly","next_renewal_at":"YYYY-MM-DD"}]}
Categories: ${EXPENSE_CATEGORIES.join(", ")}.
Rules: only include an email in "transactions" when a real money movement with an amount is stated. Marketing/offers are NOT transactions.
"credit" = money received (salary, refunds, incoming UPI). "debit" = money spent.
Bills = amount due in the future (not yet paid). Subscriptions = recurring services renewing.
confidence is 0-1 based on how explicit the email is.`;

function parseJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const match = body.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function str(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, 200) : null;
}

/** Batched AI extraction. Best-effort: any failure returns empty buckets. */
export async function extractFinance(items: ExtractInput[]): Promise<ExtractionResult> {
  const empty: ExtractionResult = { transactions: [], bills: [], subscriptions: [] };
  const key = process.env.LOVABLE_API_KEY;
  if (!key || items.length === 0) return empty;

  const byId = new Map(items.map((i) => [i.id, i]));
  const list = items
    .map(
      (m) =>
        `id=${m.id}\nfrom: ${m.from}\ndate: ${m.date}\nsubject: ${m.subject}\nattachment: ${m.hasAttachment ? "yes" : "no"}\nbody: ${(m.snippet ?? "").slice(0, 600)}`,
    )
    .join("\n---\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: list },
        ],
      }),
    });
    if (!res.ok) return empty;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = parseJson(json.choices?.[0]?.message?.content ?? "") as {
      transactions?: Record<string, unknown>[];
      bills?: Record<string, unknown>[];
      subscriptions?: Record<string, unknown>[];
    } | null;
    if (!parsed) return empty;

    const transactions: ExtractedTxn[] = [];
    for (const t of parsed.transactions ?? []) {
      const id = String(t.id ?? "");
      const src = byId.get(id);
      if (!src) continue;
      const amount = num(t.amount);
      if (amount <= 0) continue;
      const cat = String(t.category ?? "other") as FinanceCategory;
      const occurred = str(t.occurred_at) ?? src.date;
      const when = new Date(occurred);
      transactions.push({
        gmail_message_id: id,
        gmail_thread_id: src.threadId,
        direction: t.direction === "credit" ? "credit" : "debit",
        amount,
        currency: (str(t.currency) ?? "INR").toUpperCase().slice(0, 5),
        merchant: str(t.merchant),
        counterparty: str(t.counterparty),
        sender: src.from.slice(0, 200),
        occurred_at: Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
        txn_ref: str(t.txn_ref),
        upi_ref: str(t.upi_ref),
        payment_method: str(t.payment_method),
        category: (EXPENSE_CATEGORIES as readonly string[]).includes(cat) ? cat : "other",
        account_hint: str(t.account_hint),
        has_invoice: Boolean(t.has_invoice) || Boolean(src.hasAttachment),
        confidence: Math.min(1, Math.max(0, Number(t.confidence) || 0.6)),
      });
    }

    const bills: ExtractedBill[] = [];
    for (const b of parsed.bills ?? []) {
      const id = String(b.id ?? "");
      if (!byId.has(id)) continue;
      const amount = num(b.amount);
      const biller = str(b.biller);
      if (!biller || amount <= 0) continue;
      bills.push({
        gmail_message_id: id,
        biller,
        bill_type: str(b.bill_type) ?? "other",
        amount,
        currency: (str(b.currency) ?? "INR").toUpperCase().slice(0, 5),
        due_date: str(b.due_date),
      });
    }

    const subscriptions: ExtractedSubscription[] = [];
    for (const s of parsed.subscriptions ?? []) {
      const name = str(s.name);
      if (!name) continue;
      subscriptions.push({
        name,
        merchant: str(s.merchant),
        amount: num(s.amount),
        currency: (str(s.currency) ?? "INR").toUpperCase().slice(0, 5),
        cadence: str(s.cadence) ?? "monthly",
        next_renewal_at: str(s.next_renewal_at),
      });
    }

    return { transactions, bills, subscriptions };
  } catch {
    return empty;
  }
}

/** Natural-language search → structured filter, best effort. */
export async function parseFinanceQuery(q: string): Promise<{
  text: string | null;
  category: string | null;
  direction: "debit" | "credit" | null;
  minAmount: number | null;
  maxAmount: number | null;
  from: string | null;
  to: string | null;
}> {
  const fallback = { text: q, category: null, direction: null, minAmount: null, maxAmount: null, from: null, to: null };
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return fallback;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Today is ${new Date().toISOString().slice(0, 10)}. Convert a finance search phrase into JSON filters.
Reply JSON only: {"text":null,"category":null,"direction":null,"minAmount":null,"maxAmount":null,"from":null,"to":null}
"text" = merchant/keyword to match. "direction": debit for spending, credit for income. from/to are YYYY-MM-DD dates.
category must be one of: ${EXPENSE_CATEGORIES.join(", ")} or null.`,
          },
          { role: "user", content: q },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = parseJson(json.choices?.[0]?.message?.content ?? "") as Record<string, unknown> | null;
    if (!parsed) return fallback;
    const dir = parsed.direction === "credit" ? "credit" : parsed.direction === "debit" ? "debit" : null;
    const cat = str(parsed.category);
    return {
      text: str(parsed.text),
      category: cat && (EXPENSE_CATEGORIES as readonly string[]).includes(cat) ? cat : null,
      direction: dir,
      minAmount: parsed.minAmount != null ? num(parsed.minAmount) : null,
      maxAmount: parsed.maxAmount != null ? num(parsed.maxAmount) : null,
      from: str(parsed.from),
      to: str(parsed.to),
    };
  } catch {
    return fallback;
  }
}