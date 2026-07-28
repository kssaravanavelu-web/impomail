import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/message-list";
import { SyncButton, TransactionCard, EmptyFinance, GlassCard } from "@/components/finance-ui";
import { CATEGORY_LABEL, EXPENSE_CATEGORIES, formatMoney, type Transaction } from "@/lib/finance";
import { listTransactions, searchTransactions } from "@/lib/finance.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expense Tracker — ImpoMail" },
      { name: "description", content: "Every expense pulled from your payment, bank and invoice emails, categorised automatically." },
      { property: "og:title", content: "Expense Tracker — ImpoMail" },
      { property: "og:description", content: "Search your spending in plain English and re-categorise anything in one tap." },
    ],
  }),
  component: ExpensesPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

const EXAMPLES = ["How much did I spend on Swiggy?", "Food expenses in July", "UPI payments above 1000", "Show Amazon purchases"];

function ExpensesPage() {
  const fetchTxns = useServerFn(listTransactions);
  const search = useServerFn(searchTransactions);
  const [category, setCategory] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Transaction[] | null>(null);

  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["finance", "transactions", "debit", category],
    queryFn: () => fetchTxns({ data: { direction: "debit", category: category ?? undefined, limit: 300 } }),
  });

  const run = useMutation({
    mutationFn: (query: string) => search({ data: { q: query } }),
    onSuccess: (r) => setResults(r.results),
  });

  const shown = results ?? txns;
  const total = shown.reduce((s, t) => s + (t.direction === "debit" ? t.amount : 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Expense Tracker" subtitle="Read from your inbox — never from any payment app." />
        <SyncButton />
      </div>

      <GlassCard className="mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) run.mutate(q.trim());
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask in plain English — “food expenses in July”"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={run.isPending}>
            {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
          {results && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setResults(null);
                setQ("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setQ(e);
                run.mutate(e);
              }}
              className="rounded-full border border-primary/20 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {e}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(null)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs transition-colors",
            category === null ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {EXPENSE_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCategory(c);
              setResults(null);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition-colors",
              category === c ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {shown.length} transaction{shown.length === 1 ? "" : "s"} · {formatMoney(total)} total
      </p>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyFinance message="No expenses found. Sync Gmail to import your transaction emails." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <TransactionCard key={t.id} txn={t} />
          ))}
        </div>
      )}
    </div>
  );
}