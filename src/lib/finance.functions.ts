import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Budget, Bill, FinanceCategory, Insight, Subscription, Transaction } from "./finance";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_mail";

type TxnRow = Record<string, unknown>;

export type FinanceFilters = {
  text: string | null;
  category: string | null;
  direction: "debit" | "credit" | null;
  minAmount: number | null;
  maxAmount: number | null;
  from: string | null;
  to: string | null;
};

function toTxn(r: TxnRow): Transaction {
  return {
    id: String(r.id),
    direction: r.direction === "credit" ? "credit" : "debit",
    amount: Number(r.amount ?? 0),
    currency: String(r.currency ?? "INR"),
    merchant: (r.merchant as string) ?? null,
    counterparty: (r.counterparty as string) ?? null,
    sender: (r.sender as string) ?? null,
    occurred_at: String(r.occurred_at),
    txn_ref: (r.txn_ref as string) ?? null,
    upi_ref: (r.upi_ref as string) ?? null,
    payment_method: (r.payment_method as string) ?? null,
    category: (r.category as FinanceCategory) ?? "other",
    category_locked: Boolean(r.category_locked),
    account_hint: (r.account_hint as string) ?? null,
    has_invoice: Boolean(r.has_invoice),
    confidence: Number(r.confidence ?? 0.5),
    gmail_message_id: (r.gmail_message_id as string) ?? null,
    gmail_thread_id: (r.gmail_thread_id as string) ?? null,
    source: String(r.source ?? "gmail"),
    notes: (r.notes as string) ?? null,
  };
}

/* ------------------------------------------------------------------ sync */

export const syncFinance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number; maxResults?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) return { connected: false as const, scanned: 0, imported: 0, bills: 0, subscriptions: 0 };

    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
    const { financeGmailQuery, extractFinance } = await import("./finance-extract.server");

    const params = new URLSearchParams();
    params.set("maxResults", String(Math.min(data.maxResults ?? 40, 60)));
    params.set("q", financeGmailQuery(data.days ?? 120));
    const listRes = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: `/gmail/v1/users/me/messages?${params}`,
    });
    if (!listRes.ok) {
      const body = await listRes.text().catch(() => "");
      throw new Error(`Gmail search failed [${listRes.status}]: ${body.slice(0, 200)}`);
    }
    const list = (await listRes.json()) as { messages?: { id: string; threadId: string }[] };
    const ids = (list.messages ?? []).map((m) => m.id);
    if (!ids.length) return { connected: true as const, scanned: 0, imported: 0, bills: 0, subscriptions: 0 };

    // Skip anything already imported.
    const { data: existing } = await context.supabase
      .from("transactions")
      .select("gmail_message_id")
      .in("gmail_message_id", ids);
    const seen = new Set((existing ?? []).map((r) => r.gmail_message_id as string));
    const fresh = (list.messages ?? []).filter((m) => !seen.has(m.id)).slice(0, 30);
    if (!fresh.length) return { connected: true as const, scanned: ids.length, imported: 0, bills: 0, subscriptions: 0 };

    const details = await Promise.all(
      fresh.map(async (m) => {
        const r = await callAsAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: CONNECTOR_ID,
          path: `/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        });
        if (!r.ok) return null;
        const msg = (await r.json()) as {
          id: string;
          threadId: string;
          snippet?: string;
          internalDate?: string;
          payload?: { headers?: { name: string; value: string }[]; parts?: { filename?: string }[] };
        };
        const h = (n: string) =>
          msg.payload?.headers?.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
        return {
          id: msg.id,
          threadId: msg.threadId,
          from: h("From"),
          subject: h("Subject"),
          snippet: msg.snippet ?? "",
          date: h("Date") || (msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : new Date().toISOString()),
          hasAttachment: (msg.payload?.parts ?? []).some((p) => Boolean(p.filename)),
        };
      }),
    );
    const inputs = details.filter((d): d is NonNullable<typeof d> => d !== null);

    // Chunk so a single model call stays small and reliable.
    const chunks: (typeof inputs)[] = [];
    for (let i = 0; i < inputs.length; i += 10) chunks.push(inputs.slice(i, i + 10));
    const results = await Promise.all(chunks.map((c) => extractFinance(c)));

    const txns = results.flatMap((r) => r.transactions);
    const bills = results.flatMap((r) => r.bills);
    const subs = results.flatMap((r) => r.subscriptions);

    if (txns.length) {
      const { error } = await context.supabase.from("transactions").upsert(
        txns.map((t) => ({ ...t, user_id: context.userId, source: "gmail" })),
        { onConflict: "user_id,gmail_message_id", ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
    }
    if (bills.length) {
      await context.supabase.from("bills").upsert(
        bills.map((b) => ({ ...b, user_id: context.userId, source: "gmail", status: "unpaid" })),
        { onConflict: "user_id,gmail_message_id", ignoreDuplicates: true },
      );
    }
    if (subs.length) {
      await context.supabase.from("subscriptions").upsert(
        subs.map((s) => ({ ...s, user_id: context.userId, source: "gmail" })),
        { onConflict: "user_id,name" },
      );
    }

    return {
      connected: true as const,
      scanned: inputs.length,
      imported: txns.length,
      bills: bills.length,
      subscriptions: subs.length,
    };
  });

/* ---------------------------------------------------------- transactions */

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { direction?: "debit" | "credit"; category?: string; limit?: number; from?: string; to?: string } | undefined) =>
      input ?? {},
  )
  .handler(async ({ data, context }): Promise<Transaction[]> => {
    let q = context.supabase
      .from("transactions")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.direction) q = q.eq("direction", data.direction);
    if (data.category) q = q.eq("category", data.category);
    if (data.from) q = q.gte("occurred_at", data.from);
    if (data.to) q = q.lte("occurred_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(toTxn);
  });

export const updateTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; category?: string; notes?: string; direction?: "debit" | "credit" }) => input)
  .handler(async ({ data, context }) => {
    const patch: { category?: string; category_locked?: boolean; notes?: string; direction?: string } = {};
    if (data.category) {
      patch.category = data.category;
      patch.category_locked = true;
    }
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.direction) patch.direction = data.direction;
    const { error } = await context.supabase.from("transactions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("transactions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { q: string }) => input)
  .handler(async ({ data, context }): Promise<{ filters: FinanceFilters; results: Transaction[] }> => {
    const { parseFinanceQuery } = await import("./finance-extract.server");
    const f = await parseFinanceQuery(data.q);
    let q = context.supabase.from("transactions").select("*").order("occurred_at", { ascending: false }).limit(200);
    if (f.category) q = q.eq("category", f.category);
    if (f.direction) q = q.eq("direction", f.direction);
    if (f.minAmount) q = q.gte("amount", f.minAmount);
    if (f.maxAmount) q = q.lte("amount", f.maxAmount);
    if (f.from) q = q.gte("occurred_at", `${f.from}T00:00:00Z`);
    if (f.to) q = q.lte("occurred_at", `${f.to}T23:59:59Z`);
    if (f.text) {
      const t = f.text.replace(/[%,]/g, " ").trim();
      if (t) q = q.or(`merchant.ilike.%${t}%,counterparty.ilike.%${t}%,sender.ilike.%${t}%,notes.ilike.%${t}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { filters: f, results: (rows ?? []).map(toTxn) };
  });

/* -------------------------------------------------------------- budgets */

export const listBudgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Budget[]> => {
    const { data, error } = await context.supabase.from("budgets").select("*").order("category");
    if (error) throw new Error(error.message);
    return (data ?? []).map((b) => ({
      id: String(b.id),
      category: b.category as FinanceCategory,
      amount: Number(b.amount ?? 0),
      currency: String(b.currency ?? "INR"),
    }));
  });

export const upsertBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { category: string; amount: number }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("budgets").upsert(
      { user_id: context.userId, category: data.category, amount: data.amount, period: "monthly" },
      { onConflict: "user_id,category,period" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("budgets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------------------------------------- bills */

export const listBills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Bill[]> => {
    const { data, error } = await context.supabase
      .from("bills")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    const today = new Date().toISOString().slice(0, 10);
    return (data ?? []).map((b) => {
      const due = (b.due_date as string) ?? null;
      const status = b.status === "paid" ? "paid" : due && due < today ? "overdue" : "unpaid";
      return {
        id: String(b.id),
        biller: String(b.biller),
        bill_type: String(b.bill_type ?? "other") as Bill["bill_type"],
        amount: Number(b.amount ?? 0),
        currency: String(b.currency ?? "INR"),
        due_date: due,
        status: status as Bill["status"],
        gmail_message_id: (b.gmail_message_id as string) ?? null,
      };
    });
  });

export const saveBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id?: string; biller: string; bill_type: string; amount: number; due_date: string | null; status?: string }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      biller: data.biller,
      bill_type: data.bill_type,
      amount: data.amount,
      due_date: data.due_date,
      status: data.status ?? "unpaid",
      source: "manual",
    };
    const { error } = data.id
      ? await context.supabase.from("bills").update(row).eq("id", data.id)
      : await context.supabase.from("bills").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setBillStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "paid" | "unpaid" }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("bills").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("bills").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------- subscriptions */

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Subscription[]> => {
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select("*")
      .order("next_renewal_at", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((s) => ({
      id: String(s.id),
      name: String(s.name),
      merchant: (s.merchant as string) ?? null,
      amount: Number(s.amount ?? 0),
      currency: String(s.currency ?? "INR"),
      cadence: String(s.cadence ?? "monthly"),
      next_renewal_at: (s.next_renewal_at as string) ?? null,
      last_charged_at: (s.last_charged_at as string) ?? null,
      status: String(s.status ?? "active"),
    }));
  });

export const setSubscriptionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "active" | "cancelled" }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subscriptions").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subscriptions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------- insights */

export const getInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Insight[]> => {
    const { data, error } = await context.supabase
      .from("finance_insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    return (data ?? []).map((i) => ({
      id: String(i.id),
      kind: String(i.kind ?? "info"),
      title: String(i.title),
      body: (i.body as string) ?? null,
      severity: (i.severity as Insight["severity"]) ?? "info",
      created_at: String(i.created_at),
    }));
  });

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Insight[]> => {
    const { buildInsights } = await import("./finance-insights.server");
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const [{ data: txnRows }, { data: budgetRows }, { data: billRows }, { data: subRows }] = await Promise.all([
      context.supabase.from("transactions").select("*").gte("occurred_at", start),
      context.supabase.from("budgets").select("*"),
      context.supabase.from("bills").select("*"),
      context.supabase.from("subscriptions").select("*"),
    ]);

    const insights = buildInsights({
      transactions: (txnRows ?? []).map(toTxn),
      budgets: (budgetRows ?? []).map((b) => ({
        id: String(b.id),
        category: b.category as FinanceCategory,
        amount: Number(b.amount ?? 0),
        currency: String(b.currency ?? "INR"),
      })),
      bills: (billRows ?? []).map((b) => ({
        id: String(b.id),
        biller: String(b.biller),
        bill_type: String(b.bill_type ?? "other") as Bill["bill_type"],
        amount: Number(b.amount ?? 0),
        currency: String(b.currency ?? "INR"),
        due_date: (b.due_date as string) ?? null,
        status: (b.status as Bill["status"]) ?? "unpaid",
        gmail_message_id: (b.gmail_message_id as string) ?? null,
      })),
      subscriptions: (subRows ?? []).map((s) => ({
        id: String(s.id),
        name: String(s.name),
        merchant: (s.merchant as string) ?? null,
        amount: Number(s.amount ?? 0),
        currency: String(s.currency ?? "INR"),
        cadence: String(s.cadence ?? "monthly"),
        next_renewal_at: (s.next_renewal_at as string) ?? null,
        last_charged_at: (s.last_charged_at as string) ?? null,
        status: String(s.status ?? "active"),
      })),
    });

    await context.supabase.from("finance_insights").delete().eq("user_id", context.userId);
    if (insights.length) {
      await context.supabase
        .from("finance_insights")
        .insert(insights.map((i) => ({ ...i, user_id: context.userId })));
    }
    const { data: rows } = await context.supabase
      .from("finance_insights")
      .select("*")
      .order("created_at", { ascending: false });
    return (rows ?? []).map((i) => ({
      id: String(i.id),
      kind: String(i.kind ?? "info"),
      title: String(i.title),
      body: (i.body as string) ?? null,
      severity: (i.severity as Insight["severity"]) ?? "info",
      created_at: String(i.created_at),
    }));
  });

/* --------------------------------------------------------------- delete */

export const deleteAllFinanceData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    for (const table of ["transactions", "budgets", "bills", "subscriptions", "monthly_summary", "finance_insights"] as const) {
      const { error } = await context.supabase.from(table).delete().eq("user_id", uid);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });