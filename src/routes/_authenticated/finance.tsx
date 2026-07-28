import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/message-list";
import { GlassCard, StatCard, SyncButton, TransactionCard, EmptyFinance } from "@/components/finance-ui";
import { CATEGORY_LABEL, categoryColor, formatMoney, type FinanceCategory } from "@/lib/finance";
import {
  listTransactions,
  listBudgets,
  listBills,
  getInsights,
  generateInsights,
} from "@/lib/finance.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({
    meta: [
      { title: "Personal Finance — ImpoMail" },
      { name: "description", content: "Track spending, income and budgets extracted automatically from your Gmail transaction emails." },
      { property: "og:title", content: "Personal Finance — ImpoMail" },
      { property: "og:description", content: "Your money, read straight from your inbox — expenses, income, bills and budgets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinanceDashboard,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function FinanceDashboard() {
  const qc = useQueryClient();
  const fetchTxns = useServerFn(listTransactions);
  const fetchBudgets = useServerFn(listBudgets);
  const fetchBills = useServerFn(listBills);
  const fetchInsights = useServerFn(getInsights);
  const regen = useServerFn(generateInsights);

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["finance", "transactions", "all"],
    queryFn: () => fetchTxns({ data: { limit: 400 } }),
  });
  const { data: budgets = [] } = useQuery({ queryKey: ["finance", "budgets"], queryFn: () => fetchBudgets() });
  const { data: bills = [] } = useQuery({ queryKey: ["finance", "bills"], queryFn: () => fetchBills() });
  const { data: insights = [] } = useQuery({ queryKey: ["finance", "insights"], queryFn: () => fetchInsights() });

  const refresh = useMutation({
    mutationFn: () => regen(),
    onSuccess: () => {
      toast.success("Insights refreshed");
      qc.invalidateQueries({ queryKey: ["finance", "insights"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now).getTime();
    const weekAgo = today - 6 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    let todaySpend = 0, weekSpend = 0, monthSpend = 0, monthIncome = 0, lastMonthSpend = 0;
    const byCat = new Map<string, number>();
    const byDay = new Map<string, number>();
    let largest: (typeof txns)[number] | null = null;

    for (const t of txns) {
      const ts = new Date(t.occurred_at).getTime();
      const debit = t.direction === "debit";
      if (ts >= lastMonthStart && ts < monthStart && debit) lastMonthSpend += t.amount;
      if (ts >= monthStart) {
        if (debit) {
          monthSpend += t.amount;
          byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
          if (!largest || t.amount > largest.amount) largest = t;
        } else monthIncome += t.amount;
      }
      if (ts >= weekAgo && debit) {
        weekSpend += t.amount;
        const k = new Date(ts).toLocaleDateString(undefined, { weekday: "short" });
        byDay.set(k, (byDay.get(k) ?? 0) + t.amount);
      }
      if (ts >= today && debit) todaySpend += t.amount;
    }

    const budgetTotal = budgets.reduce((s, b) => s + b.amount, 0);
    const budgetSpent = budgets.reduce((s, b) => s + (byCat.get(b.category) ?? 0), 0);

    return {
      todaySpend,
      weekSpend,
      monthSpend,
      monthIncome,
      lastMonthSpend,
      savings: monthIncome - monthSpend,
      budgetRemaining: budgetTotal - budgetSpent,
      budgetTotal,
      largest,
      pie: [...byCat.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name: CATEGORY_LABEL[name as FinanceCategory] ?? name, key: name, value })),
      week: [...byDay.entries()].map(([day, amount]) => ({ day, amount })),
    };
  }, [txns, budgets]);

  const upcoming = bills.filter((b) => b.status !== "paid").slice(0, 4);
  const recent = txns.slice(0, 6);

  const monthDelta =
    stats.lastMonthSpend > 0
      ? Math.round(((stats.monthSpend - stats.lastMonthSpend) / stats.lastMonthSpend) * 100)
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Personal Finance"
          subtitle="Expenses and income read automatically from your Gmail transaction emails."
        />
        <div className="flex gap-2">
          <SyncButton />
          <Button variant="outline" className="gap-2" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            {refresh.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Insights
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : txns.length === 0 ? (
        <EmptyFinance message="No transactions yet. Sync your Gmail and ImpoMail will read payment, bank and invoice emails to build your expense history." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Today" value={formatMoney(stats.todaySpend)} />
            <StatCard label="This week" value={formatMoney(stats.weekSpend)} />
            <StatCard label="This month" value={formatMoney(stats.monthSpend)} hint={monthDelta !== null ? `${monthDelta > 0 ? "+" : ""}${monthDelta}% vs last month` : undefined} tone="down" />
            <StatCard label="Income" value={formatMoney(stats.monthIncome)} tone="up" />
            <StatCard label="Savings" value={formatMoney(stats.savings)} tone={stats.savings >= 0 ? "up" : "down"} />
            <StatCard
              label="Budget left"
              value={stats.budgetTotal ? formatMoney(stats.budgetRemaining) : "—"}
              hint={stats.budgetTotal ? `of ${formatMoney(stats.budgetTotal)}` : "Set budgets"}
            />
            <StatCard
              label="Largest expense"
              value={stats.largest ? formatMoney(stats.largest.amount, stats.largest.currency) : "—"}
              hint={stats.largest?.merchant ?? undefined}
            />
            <StatCard label="Transactions" value={String(txns.length)} hint="imported from mail" />
          </div>

          {insights.length > 0 && (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {insights.slice(0, 6).map((i) => (
                <GlassCard
                  key={i.id}
                  className={cn(
                    "border-l-4 p-4",
                    i.severity === "critical" && "border-l-rose-500",
                    i.severity === "warning" && "border-l-amber-400",
                    i.severity === "success" && "border-l-emerald-400",
                    i.severity === "info" && "border-l-primary",
                  )}
                >
                  <p className="text-sm font-semibold">{i.title}</p>
                  {i.body && <p className="mt-1 text-xs text-muted-foreground">{i.body}</p>}
                </GlassCard>
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <GlassCard>
              <h2 className="mb-3 text-sm font-semibold">Category-wise spending</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={3} animationDuration={800}>
                      {stats.pie.map((s) => (
                        <Cell key={s.key} fill={categoryColor(s.key)} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "oklch(0.18 0 0)", border: "1px solid oklch(0.4 0 0)", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => formatMoney(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {stats.pie.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(s.key) }} />
                    {s.name}
                  </span>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="mb-3 text-sm font-semibold">Cash flow — last 7 days</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.week}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0 0 / 0.3)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" width={50} />
                    <Tooltip
                      cursor={{ fill: "oklch(0.5 0 0 / 0.1)" }}
                      contentStyle={{ background: "oklch(0.18 0 0)", border: "1px solid oklch(0.4 0 0)", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => formatMoney(v)}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="oklch(0.8 0.11 85)" animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Recent transactions</h2>
                <Link to="/expenses" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {recent.map((t) => (
                  <TransactionCard key={t.id} txn={t} />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Upcoming bills</h2>
                <Link to="/bills" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  All bills <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid gap-3">
                {upcoming.length === 0 && (
                  <GlassCard className="py-8 text-center text-xs text-muted-foreground">No pending bills detected.</GlassCard>
                )}
                {upcoming.map((b) => (
                  <GlassCard key={b.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{b.biller}</p>
                      <p className="shrink-0 text-sm tabular-nums">{formatMoney(b.amount, b.currency)}</p>
                    </div>
                    <p className={cn("mt-1 text-xs", b.status === "overdue" ? "text-rose-400" : "text-muted-foreground")}>
                      {b.due_date ? `Due ${b.due_date}` : "No due date"} · {b.status}
                    </p>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}