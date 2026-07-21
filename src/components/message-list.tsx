import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { categoryMeta, type Message } from "@/lib/mock-data";

export function MessageList({ items, emptyText }: { items: Message[]; emptyText: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-12 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
      {items.map((m) => {
        const meta = categoryMeta[m.category];
        return (
          <Link
            key={m.id}
            to="/message/$id"
            params={{ id: m.id }}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/40"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold">
              {m.from.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`truncate text-sm ${m.unread ? "font-semibold" : "font-medium"}`}>{m.from}</span>
                <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                {m.starred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
              </div>
              <div className={`truncate text-sm ${m.unread ? "text-foreground" : "text-muted-foreground"}`}>{m.subject}</div>
              <div className="truncate text-xs text-muted-foreground">{m.preview}</div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{m.time}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}