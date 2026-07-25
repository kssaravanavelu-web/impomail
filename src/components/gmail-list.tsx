import { Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { categoryMeta } from "@/lib/mock-data";
import type { GmailMessageSummary } from "@/lib/gmail.functions";

function formatTime(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function nameFromHeader(from: string): string {
  const m = from.match(/^"?([^"<]+?)"?\s*<[^>]+>/);
  return (m ? m[1] : from.split("@")[0] ?? from).trim() || from;
}

export function GmailList({
  items,
  loading,
  error,
  emptyText,
}: {
  items: GmailMessageSummary[];
  loading?: boolean;
  error?: string | null;
  emptyText: string;
}) {
  if (loading) {
    return (
      <div className="glass-card flex items-center justify-center gap-3 rounded-2xl p-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your Gmail…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center text-sm text-muted-foreground">
        <Mail className="mx-auto mb-3 h-6 w-6 opacity-60" />
        {emptyText}
      </div>
    );
  }
  return (
    <div className="glass-card divide-y divide-primary/10 overflow-hidden rounded-2xl">
      {items.map((m) => {
        const meta = categoryMeta[m.category];
        const name = nameFromHeader(m.from);
        return (
          <Link
            key={m.id}
            to="/message/$id"
            params={{ id: m.id }}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-primary/[0.04]"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`truncate text-sm ${m.unread ? "font-semibold" : "font-medium"}`}>{name}</span>
                <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
              </div>
              <div className={`truncate text-sm ${m.unread ? "text-foreground" : "text-muted-foreground"}`}>{m.subject || "(no subject)"}</div>
              <div className="truncate text-xs text-muted-foreground">{m.snippet}</div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatTime(m.date)}</span>
          </Link>
        );
      })}
    </div>
  );
}