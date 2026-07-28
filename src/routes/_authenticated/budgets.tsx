import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/message-list";
import { GlassCard } from "@/components/finance-ui";
import { BUDGET_CATEGORIES, CATEGORY_LABEL, categoryColor, formatMoney } from "@/lib/finance";
import { listBudgets, upsertBudget, deleteBudget, listTransactions } from "@/lib/finance.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({
    meta: [
      { title: "Budgets — ImpoMail" },
      { name: "description", content: "Set monthly category budgets and watch progress against real spending from your inbox." },
      { property: "og:title", content: "Budgets — ImpoMail" },
      { property: "og:description", content: "Get warned the moment a category crosses 80% of its monthly limit." },
    ],
  }),
  component: BudgetsPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function BudgetsPage() {
  const qc = useQueryClient();
  const fetchBudgets = useServerFn(listBudgets);
  const fetchTxns = useServerFn(listTransactions);
  const save = useServerFn(upsertBudget);
  const remove = useServerFn(deleteBudget);

  const [category, setCategory] = useState<string>(BUDGET_CATEGORIES[0]);
  const [amount, setAmount] = useState("");

  const { data: budgets = [], isLoading } = useQuery({ queryKey: ["finance", "budgets"], queryFn: () => fetchBudgets() });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: txns = [] } = useQuery({
    queryKey: ["finance", "transactions", "month"],
    queryFn: () => fetchTxns({ data: { direction: "debit", from: monthStart, limit: 400 } }),
  });

  const spentBy = new Map<string, number>();
  for (const t of txns) spentBy.set(t.category, (spentBy.get(t.category) ?? 0) + t.amount);

  const add = useMutation({
    mutationFn: () => save({ data: { category, amount: Number(amount) } }),
    onSuccess: () => {
      toast.success("Budget saved");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["finance", "budgets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "budgets"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
      <PageHeader title="Budgets" subtitle="Monthly limits per category, measured against real spending." />

      <GlassCard className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-40 flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUDGET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-32 flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Monthly limit</label>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" />
          </div>
          <Button className="gap-2" disabled={!Number(amount) || add.isPending} onClick={() => add.mutate()}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Set budget
          </Button>
        </div>
      </GlassCard>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : budgets.length === 0 ? (
        <GlassCard className="py-14 text-center text-sm text-muted-foreground">
          No budgets yet. Add one above to start tracking.
        </GlassCard>
      ) : (
        <div className="grid gap-3">
          {budgets.map((b) => {
            const spent = spentBy.get(b.category) ?? 0;
            const pct = b.amount > 0 ? Math.min(999, Math.round((spent / b.amount) * 100)) : 0;
            return (
              <GlassCard key={b.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{CATEGORY_LABEL[b.category] ?? b.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(spent, b.currency)} spent of {formatMoney(b.amount, b.currency)} ·{" "}
                      <span className={cn(pct >= 100 ? "text-rose-400" : pct >= 80 ? "text-amber-400" : "text-emerald-400")}>
                        {pct}% used
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {formatMoney(Math.max(0, b.amount - spent), b.currency)} left
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => del.mutate(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: pct >= 100 ? "oklch(0.65 0.2 20)" : pct >= 80 ? "oklch(0.8 0.15 80)" : categoryColor(b.category),
                    }}
                  />
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}