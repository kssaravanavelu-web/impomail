import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/message-list";
import { GmailList } from "@/components/gmail-list";
import { listGmailMessages } from "@/lib/gmail.functions";
import { categoryMeta, type Category } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — ImpoMail" }, { name: "description", content: "Your Gmail inbox." }] }),
  component: InboxPage,
});

function InboxPage() {
  const fetchFn = useServerFn(listGmailMessages);
  const { data, isLoading, error } = useQuery({
    queryKey: ["gmail", "inbox"],
    queryFn: () => fetchFn({ data: { labelIds: ["INBOX"], maxResults: 30 } }),
  });
  const all = data ?? [];
  const [filter, setFilter] = useState<Category | "all">("all");
  const counts = all.reduce<Record<string, number>>((acc, m) => {
    acc[m.category] = (acc[m.category] ?? 0) + 1;
    return acc;
  }, {});
  const available = (Object.keys(categoryMeta) as Category[]).filter((c) => counts[c]);
  const items = filter === "all" ? all : all.filter((m) => m.category === filter);
  const unread = items.filter((m) => m.unread).length;
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Inbox" subtitle={isLoading ? "Loading…" : `${unread} unread · ${items.length} messages`} />
      {available.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filter === "all"
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            All · {all.length}
          </button>
          {available.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                filter === c
                  ? `${categoryMeta[c].bg} ${categoryMeta[c].color}`
                  : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {categoryMeta[c].label} · {counts[c]}
            </button>
          ))}
        </div>
      )}
      <GmailList
        items={items}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyText={filter === "all" ? "Your inbox is empty." : `No ${categoryMeta[filter].label.toLowerCase()} messages.`}
      />
    </div>
  );
}