import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Trash2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_LABEL,
  EXPENSE_CATEGORIES,
  categoryColor,
  formatMoney,
  type Transaction,
} from "@/lib/finance";
import { syncFinance, updateTransaction, deleteTransaction } from "@/lib/finance.functions";
import { cn } from "@/lib/utils";

/** Glass surface used across every finance screen. */
export function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/15 bg-card/60 p-5 backdrop-blur-xl",
        "shadow-[0_20px_60px_-30px_oklch(0_0_0/0.8)] transition-transform duration-500 hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "up" | "down";
}) {
  return (
    <GlassCard className="p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "up" && "text-emerald-400",
          tone === "down" && "text-rose-400",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </GlassCard>
  );
}

export function SyncButton({ label = "Sync Gmail" }: { label?: string }) {
  const qc = useQueryClient();
  const sync = useServerFn(syncFinance);
  const m = useMutation({
    mutationFn: () => sync({ data: {} }),
    onSuccess: (r) => {
      if (!r.connected) {
        toast.error("Connect Gmail first to scan for transactions.");
        return;
      }
      toast.success(
        r.imported > 0
          ? `Imported ${r.imported} transaction${r.imported === 1 ? "" : "s"} from ${r.scanned} emails.`
          : `Scanned ${r.scanned} emails — nothing new.`,
      );
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button onClick={() => m.mutate()} disabled={m.isPending} className="gap-2">
      {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {m.isPending ? "Scanning mail…" : label}
    </Button>
  );
}

export function CategoryPill({ category }: { category: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        color: categoryColor(category),
        background: `color-mix(in oklch, ${categoryColor(category)} 14%, transparent)`,
      }}
    >
      {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL] ?? category}
    </span>
  );
}

export function TransactionCard({ txn }: { txn: Transaction }) {
  const qc = useQueryClient();
  const update = useServerFn(updateTransaction);
  const remove = useServerFn(deleteTransaction);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["finance"] });

  const setCategory = useMutation({
    mutationFn: (category: string) => update({ data: { id: txn.id, category } }),
    onSuccess: () => {
      toast.success("Category updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: () => remove({ data: { id: txn.id } }),
    onSuccess: () => {
      toast.success("Transaction removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const when = new Date(txn.occurred_at);
  const credit = txn.direction === "credit";

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {txn.merchant ?? txn.counterparty ?? txn.sender ?? "Unknown"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {when.toLocaleDateString()} · {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {txn.payment_method ? ` · ${txn.payment_method.toUpperCase()}` : ""}
          </p>
        </div>
        <p className={cn("shrink-0 text-base font-semibold tabular-nums", credit ? "text-emerald-400" : "text-foreground")}>
          {credit ? "+" : "−"}
          {formatMoney(txn.amount, txn.currency)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CategoryPill category={txn.category} />
        {txn.has_invoice && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Paperclip className="h-3 w-3" /> Invoice
          </Badge>
        )}
        {txn.upi_ref && <span className="text-[10px] text-muted-foreground">UPI {txn.upi_ref}</span>}
        {!txn.upi_ref && txn.txn_ref && <span className="text-[10px] text-muted-foreground">Ref {txn.txn_ref}</span>}
        <span className="text-[10px] text-muted-foreground">
          {Math.round(txn.confidence * 100)}% confidence
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Select value={txn.category} onValueChange={(v) => setCategory.mutate(v)}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => del.mutate()}
          aria-label="Delete transaction"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </GlassCard>
  );
}

export function EmptyFinance({ message }: { message: string }) {
  return (
    <GlassCard className="py-14 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="mt-4 flex justify-center">
        <SyncButton />
      </div>
    </GlassCard>
  );
}