import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Plus, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/message-list";
import { GlassCard, StatCard, SyncButton } from "@/components/finance-ui";
import { BILL_TYPES, BILL_TYPE_LABEL, formatMoney, type BillType } from "@/lib/finance";
import { listBills, saveBill, setBillStatus, deleteBill } from "@/lib/finance.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({
    meta: [
      { title: "Bills — ImpoMail" },
      { name: "description", content: "Electricity, gas, broadband, insurance and card dues detected from your inbox with reminders." },
      { property: "og:title", content: "Bills — ImpoMail" },
      { property: "og:description", content: "Never miss a due date — bills are read straight out of your Gmail." },
    ],
  }),
  component: BillsPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function BillsPage() {
  const qc = useQueryClient();
  const fetchBills = useServerFn(listBills);
  const save = useServerFn(saveBill);
  const setStatus = useServerFn(setBillStatus);
  const remove = useServerFn(deleteBill);

  const [biller, setBiller] = useState("");
  const [type, setType] = useState<BillType>("electricity");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");

  const { data: bills = [], isLoading } = useQuery({ queryKey: ["finance", "bills"], queryFn: () => fetchBills() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["finance", "bills"] });

  const add = useMutation({
    mutationFn: () => save({ data: { biller, bill_type: type, amount: Number(amount), due_date: due || null } }),
    onSuccess: () => {
      toast.success("Bill added");
      setBiller("");
      setAmount("");
      setDue("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; status: "paid" | "unpaid" }) => setStatus({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = bills.filter((b) => b.status !== "paid");
  const overdue = bills.filter((b) => b.status === "overdue");
  const dueTotal = pending.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Bills" subtitle="Detected automatically from bill and due-date emails." />
        <SyncButton label="Scan for bills" />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="Pending" value={String(pending.length)} />
        <StatCard label="Overdue" value={String(overdue.length)} tone={overdue.length ? "down" : "default"} />
        <StatCard label="Amount due" value={formatMoney(dueTotal)} />
      </div>

      <GlassCard className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="Biller" value={biller} onChange={(e) => setBiller(e.target.value)} />
          <Select value={type} onValueChange={(v) => setType(v as BillType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BILL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{BILL_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <Button className="gap-2" disabled={!biller.trim() || !Number(amount) || add.isPending} onClick={() => add.mutate()}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </Button>
        </div>
      </GlassCard>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : bills.length === 0 ? (
        <GlassCard className="py-14 text-center text-sm text-muted-foreground">
          No bills detected yet. Sync Gmail or add one manually above.
        </GlassCard>
      ) : (
        <div className="grid gap-3">
          {bills.map((b) => (
            <GlassCard key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{b.biller}</p>
                <p className="text-xs text-muted-foreground">
                  {BILL_TYPE_LABEL[b.bill_type] ?? b.bill_type} · {b.due_date ? `Due ${b.due_date}` : "No due date"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px]",
                    b.status === "paid" && "bg-emerald-500/15 text-emerald-400",
                    b.status === "overdue" && "bg-rose-500/15 text-rose-400",
                    b.status === "unpaid" && "bg-amber-500/15 text-amber-400",
                  )}
                >
                  {b.status}
                </span>
                <span className="text-sm font-semibold tabular-nums">{formatMoney(b.amount, b.currency)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={b.status === "paid" ? "Mark unpaid" : "Mark paid"}
                  onClick={() => toggle.mutate({ id: b.id, status: b.status === "paid" ? "unpaid" : "paid" })}
                >
                  {b.status === "paid" ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => del.mutate(b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}