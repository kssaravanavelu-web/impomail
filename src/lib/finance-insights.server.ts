import { CATEGORY_LABEL, formatMoney, type Bill, type Budget, type FinanceCategory, type Subscription, type Transaction } from "./finance";

export type NewInsight = {
  kind: string;
  title: string;
  body: string | null;
  severity: "info" | "warning" | "critical" | "success";
};

function sameMonth(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

/**
 * Deterministic insight engine on top of the extracted data — spending
 * trends, budget breaches, duplicates, renewals and unpaid bills.
 */
export function buildInsights(input: {
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  subscriptions: Subscription[];
}): NewInsight[] {
  const out: NewInsight[] = [];
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonth = input.transactions.filter((t) => sameMonth(t.occurred_at, now));
  const lastMonth = input.transactions.filter((t) => sameMonth(t.occurred_at, prev));
  const spend = (rows: Transaction[]) => rows.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);

  const thisSpend = spend(thisMonth);
  const lastSpend = spend(lastMonth);

  // Category totals this month
  const byCat = new Map<string, number>();
  for (const t of thisMonth) {
    if (t.direction !== "debit") continue;
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  }
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) {
    out.push({
      kind: "category_top",
      title: `You spent ${formatMoney(top[1])} on ${CATEGORY_LABEL[top[0] as FinanceCategory] ?? top[0]} this month.`,
      body: "Your largest spending category so far this month.",
      severity: "info",
    });
  }

  if (lastSpend > 0 && thisSpend > 0) {
    const pct = Math.round(((thisSpend - lastSpend) / lastSpend) * 100);
    if (Math.abs(pct) >= 5) {
      out.push({
        kind: "month_compare",
        title: `You spent ${Math.abs(pct)}% ${pct > 0 ? "more" : "less"} than last month.`,
        body: `${formatMoney(thisSpend)} this month vs ${formatMoney(lastSpend)} last month.`,
        severity: pct > 25 ? "warning" : "info",
      });
    }
  }

  // Per-category month-over-month rises
  const lastByCat = new Map<string, number>();
  for (const t of lastMonth) {
    if (t.direction !== "debit") continue;
    lastByCat.set(t.category, (lastByCat.get(t.category) ?? 0) + t.amount);
  }
  for (const [cat, amount] of byCat) {
    const before = lastByCat.get(cat) ?? 0;
    if (before > 0 && amount > before * 1.4) {
      out.push({
        kind: "category_rise",
        title: `${CATEGORY_LABEL[cat as FinanceCategory] ?? cat} expenses increased this month.`,
        body: `Up from ${formatMoney(before)} to ${formatMoney(amount)}.`,
        severity: "warning",
      });
    }
  }

  // Budgets
  for (const b of input.budgets) {
    const spent = byCat.get(b.category) ?? 0;
    if (b.amount <= 0) continue;
    const pct = Math.round((spent / b.amount) * 100);
    if (pct >= 100) {
      out.push({
        kind: "budget",
        title: `${CATEGORY_LABEL[b.category] ?? b.category} crossed your monthly budget.`,
        body: `${formatMoney(spent)} spent of a ${formatMoney(b.amount)} budget (${pct}%).`,
        severity: "critical",
      });
    } else if (pct >= 80) {
      out.push({
        kind: "budget",
        title: `${CATEGORY_LABEL[b.category] ?? b.category} budget is ${pct}% used.`,
        body: `${formatMoney(b.amount - spent)} left for the rest of the month.`,
        severity: "warning",
      });
    }
  }

  // Upcoming subscription renewals
  const soon = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  for (const s of input.subscriptions) {
    if (s.status !== "active" || !s.next_renewal_at) continue;
    if (s.next_renewal_at >= today && s.next_renewal_at <= soon) {
      out.push({
        kind: "renewal",
        title: `Your ${s.name} subscription renews ${s.next_renewal_at === today ? "today" : "soon"}.`,
        body: `${formatMoney(s.amount, s.currency)} on ${s.next_renewal_at}.`,
        severity: "info",
      });
    }
  }

  // Unpaid / overdue bills
  for (const b of input.bills) {
    if (b.status === "paid" || !b.due_date) continue;
    if (b.due_date < today) {
      out.push({
        kind: "bill",
        title: `${b.biller} bill has not been paid.`,
        body: `${formatMoney(b.amount, b.currency)} was due on ${b.due_date}.`,
        severity: "critical",
      });
    } else if (b.due_date <= soon) {
      out.push({
        kind: "bill",
        title: `${b.biller} bill is due on ${b.due_date}.`,
        body: `${formatMoney(b.amount, b.currency)} pending.`,
        severity: "warning",
      });
    }
  }

  // Duplicate detection: same amount + merchant within 24h
  const seen = new Map<string, Transaction>();
  for (const t of input.transactions) {
    const k = `${t.amount}|${(t.merchant ?? t.counterparty ?? "").toLowerCase()}`;
    const prevTxn = seen.get(k);
    if (
      prevTxn &&
      Math.abs(new Date(prevTxn.occurred_at).getTime() - new Date(t.occurred_at).getTime()) < 86400000 &&
      prevTxn.id !== t.id
    ) {
      out.push({
        kind: "duplicate",
        title: `Possible duplicate charge of ${formatMoney(t.amount, t.currency)}.`,
        body: `${t.merchant ?? t.counterparty ?? "Unknown merchant"} appears twice within 24 hours.`,
        severity: "warning",
      });
    }
    seen.set(k, t);
  }

  // Unusual spend: any single debit > 3x the median debit
  const debits = input.transactions.filter((t) => t.direction === "debit").map((t) => t.amount).sort((a, b) => a - b);
  if (debits.length >= 5) {
    const median = debits[Math.floor(debits.length / 2)];
    const biggest = thisMonth.filter((t) => t.direction === "debit").sort((a, b) => b.amount - a.amount)[0];
    if (biggest && median > 0 && biggest.amount > median * 3) {
      out.push({
        kind: "unusual",
        title: `Unusually large payment of ${formatMoney(biggest.amount, biggest.currency)}.`,
        body: `${biggest.merchant ?? biggest.counterparty ?? "Unknown"} — well above your typical spend.`,
        severity: "warning",
      });
    }
  }

  const income = thisMonth.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  if (income > 0 && income > thisSpend) {
    out.push({
      kind: "savings",
      title: `You saved ${formatMoney(income - thisSpend)} this month.`,
      body: `${formatMoney(income)} in, ${formatMoney(thisSpend)} out.`,
      severity: "success",
    });
  }

  // De-dupe by title, keep the strongest signals first.
  const uniq = new Map<string, NewInsight>();
  for (const i of out) if (!uniq.has(i.title)) uniq.set(i.title, i);
  return [...uniq.values()].slice(0, 12);
}