import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/message-list";
import { GlassCard, StatCard, SyncButton } from "@/components/finance-ui";
import { formatMoney } from "@/lib/finance";
import { listSubscriptions, setSubscriptionStatus, deleteSubscription } from "@/lib/finance.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — ImpoMail" },
      { name: "description", content: "Recurring services detected from renewal emails, with next charge dates and monthly cost." },
      { property: "og:title", content: "Subscriptions — ImpoMail" },
      { property: "og:description", content: "See what renews next and what it quietly costs you every month." },
    ],
  }),
  component: SubscriptionsPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function SubscriptionsPage() {
  const qc = useQueryClient();
  const fetchSubs = useServerFn(listSubscriptions);
  const setStatus = useServerFn(setSubscriptionStatus);
  const remove = useServerFn(deleteSubscription);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["finance", "subscriptions"] });

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["finance", "subscriptions"],
    queryFn: () => fetchSubs(),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; status: "active" | "cancelled" }) => setStatus({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const active = subs.filter((s) => s.status === "active");
  const monthly = active.reduce(
    (sum, s) => sum + (s.cadence === "yearly" ? s.amount / 12 : s.cadence === "weekly" ? s.amount * 4.33 : s.amount),
    0,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Subscriptions" subtitle="Recurring charges found in your renewal emails." />
        <SyncButton label="Scan for renewals" />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="Active" value={String(active.length)} />
        <StatCard label="Per month" value={formatMoney(monthly)} tone="down" />
        <StatCard label="Per year" value={formatMoney(monthly * 12)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : subs.length === 0 ? (
        <GlassCard className="py-14 text-center text-sm text-muted-foreground">
          No subscriptions detected yet. Sync Gmail to find renewal emails.
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subs.map((s) => (
            <GlassCard key={s.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.cadence} · {s.next_renewal_at ? `renews ${s.next_renewal_at}` : "renewal date unknown"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(s.amount, s.currency)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px]",
                    s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground",
                    s.next_renewal_at === today && s.status === "active" && "bg-amber-500/15 text-amber-400",
                  )}
                >
                  {s.next_renewal_at === today && s.status === "active" ? "renews today" : s.status}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={s.status === "active" ? "Mark cancelled" : "Mark active"}
                    onClick={() => toggle.mutate({ id: s.id, status: s.status === "active" ? "cancelled" : "active" })}
                  >
                    {s.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => del.mutate(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}