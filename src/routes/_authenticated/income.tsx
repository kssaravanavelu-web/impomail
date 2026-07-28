import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/message-list";
import { StatCard, SyncButton, TransactionCard, EmptyFinance } from "@/components/finance-ui";
import { formatMoney } from "@/lib/finance";
import { listTransactions } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({
    meta: [
      { title: "Income — ImpoMail" },
      { name: "description", content: "Salary, refunds and incoming payments detected from your Gmail credit alerts." },
      { property: "og:title", content: "Income — ImpoMail" },
      { property: "og:description", content: "See every rupee that came in, grouped by month and source." },
    ],
  }),
  component: IncomePage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function IncomePage() {
  const fetchTxns = useServerFn(listTransactions);
  const { data: txns = [], isLoading } = useQuery({
    queryKey: ["finance", "transactions", "credit"],
    queryFn: () => fetchTxns({ data: { direction: "credit", limit: 300 } }),
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonth = txns.filter((t) => new Date(t.occurred_at).getTime() >= monthStart);
  const total = txns.reduce((s, t) => s + t.amount, 0);
  const monthTotal = thisMonth.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Income" subtitle="Credits found in your bank, UPI and payout emails." />
        <SyncButton />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="This month" value={formatMoney(monthTotal)} tone="up" />
        <StatCard label="All time" value={formatMoney(total)} tone="up" />
        <StatCard label="Credits" value={String(txns.length)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : txns.length === 0 ? (
        <EmptyFinance message="No income detected yet. Sync Gmail so ImpoMail can read your credit alerts and payout emails." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {txns.map((t) => (
            <TransactionCard key={t.id} txn={t} />
          ))}
        </div>
      )}
    </div>
  );
}