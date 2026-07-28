import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/message-list";
import { GlassCard, StatCard, SyncButton } from "@/components/finance-ui";
import { CATEGORY_LABEL, categoryColor, formatMoney, type FinanceCategory } from "@/lib/finance";
import { listTransactions } from "@/lib/finance.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Finance Analytics — ImpoMail" },
      { name: "description", content: "Monthly comparison, cash flow and category breakdowns of your mail-sourced transactions." },
      { property: "og:title", content: "Finance Analytics — ImpoMail" },
      { property: "og:description", content: "Animated charts over your real spending history, straight from Gmail." },
    ],
  }),
  component: AnalyticsPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

const TOOLTIP = {
  background: "oklch(0.18 0 0)",
  border: "1px solid oklch(0.4 0 0)",
  borderRadius: 12,
  fontSize: 12,
};

function AnalyticsPage() {
  const fetchTxns = useServerFn(listTransactions);
  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["finance", "transactions", "all"],
    queryFn: () => fetchTxns({ data: { limit: 400 } }),
  });
  const [monthOffset, setMonthOffset] = useState(0);

  const data = useMemo(() => {
    const months = new Map<string, { month: string; income: number; expense: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.set(k, { month: d.toLocaleDateString(undefined, { month: "short" }), income: 0, expense: 0 });
    }
    for (const t of txns) {
      const d = new Date(t.occurred_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = months.get(k);
      if (!row) continue;
      if (t.direction === "credit") row.income += t.amount;
      else row.expense += t.amount;
    }

    const ref = new Date();
    ref.setMonth(ref.getMonth() - monthOffset, 1);
    const byCat = new Map<string, number>();
    const byDay = new Map<number, number>();
    let income = 0;
    let expense = 0;
    for (const t of txns) {
      const d = new Date(t.occurred_at);
      if (d.getFullYear() !== ref.getFullYear() || d.getMonth() !== ref.getMonth()) continue;
      if (t.direction === "credit") income += t.amount;
      else {
        expense += t.amount;
        byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
        byDay.set(d.getDate(), (byDay.get(d.getDate()) ?? 0) + t.amount);
      }
    }
    const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    let running = 0;
    const flow = Array.from({ length: daysInMonth }, (_, i) => {
      running += byDay.get(i + 1) ?? 0;
      return { day: String(i + 1), spend: byDay.get(i + 1) ?? 0, cumulative: running };
    });

    return {
      monthly: [...months.values()],
      label: ref.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      income,
      expense,
      byCat: [...byCat.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, value]) => ({ key, name: CATEGORY_LABEL[key as FinanceCategory] ?? key, value })),
      flow,
      calendar: { daysInMonth, byDay, firstWeekday: new Date(ref.getFullYear(), ref.getMonth(), 1).getDay() },
    };
  }, [txns, monthOffset]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const maxDay = Math.max(1, ...[...data.calendar.byDay.values()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Analytics" subtitle="Where the money went, month by month." />
        <SyncButton />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((o) => {
          const d = new Date();
          d.setMonth(d.getMonth() - o, 1);
          return (
            <button
              key={o}
              onClick={() => setMonthOffset(o)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs transition-colors",
                monthOffset === o ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
            </button>
          );
        })}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={`${data.label} income`} value={formatMoney(data.income)} tone="up" />
        <StatCard label={`${data.label} expense`} value={formatMoney(data.expense)} tone="down" />
        <StatCard label="Net" value={formatMoney(data.income - data.expense)} tone={data.income - data.expense >= 0 ? "up" : "down"} />
        <StatCard label="Categories used" value={String(data.byCat.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="mb-3 text-sm font-semibold">Monthly comparison</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0 0 / 0.3)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" width={52} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => formatMoney(v)} cursor={{ fill: "oklch(0.5 0 0 / 0.08)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="income" fill="oklch(0.75 0.15 155)" radius={[6, 6, 0, 0]} animationDuration={900} />
                <Bar dataKey="expense" fill="oklch(0.72 0.16 20)" radius={[6, 6, 0, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-3 text-sm font-semibold">Cash flow — {data.label}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.flow}>
                <defs>
                  <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.8 0.11 85)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.8 0.11 85)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.35 0 0 / 0.3)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="oklch(0.6 0 0)" interval={4} />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.6 0 0)" width={52} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => formatMoney(v)} />
                <Area type="monotone" dataKey="cumulative" stroke="oklch(0.85 0.11 85)" fill="url(#flowFill)" strokeWidth={2} animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-3 text-sm font-semibold">Category split</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byCat} dataKey="value" nameKey="name" outerRadius={95} animationDuration={800}>
                  {data.byCat.map((c) => (
                    <Cell key={c.key} fill={categoryColor(c.key)} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {data.byCat.slice(0, 6).map((c) => (
              <div key={c.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(c.key) }} />
                  {c.name}
                </span>
                <span className="tabular-nums">{formatMoney(c.value)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-3 text-sm font-semibold">Spending calendar — {data.label}</h2>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
            {Array.from({ length: data.calendar.firstWeekday }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: data.calendar.daysInMonth }, (_, i) => {
              const amt = data.calendar.byDay.get(i + 1) ?? 0;
              const intensity = amt / maxDay;
              return (
                <div
                  key={i}
                  title={amt ? formatMoney(amt) : "No spend"}
                  className="aspect-square rounded-md border border-primary/10 text-[10px] leading-[2.2] transition-transform hover:scale-110"
                  style={{
                    background: amt
                      ? `color-mix(in oklch, oklch(0.8 0.11 85) ${Math.round(15 + intensity * 70)}%, transparent)`
                      : "transparent",
                  }}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}