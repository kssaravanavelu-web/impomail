import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { messages, categoryMeta, type Category } from "@/lib/mock-data";
import { MessageList, PageHeader } from "@/components/message-list";
import { Input } from "@/components/ui/input";
import { MicButton } from "@/components/mic-button";

const categories = Object.keys(categoryMeta) as Category[];

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — ImpoMail" }, { name: "description", content: "Search your inbox." }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Category | "all">("all");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter !== "all" && m.category !== filter) return false;
      if (!term) return true;
      return [m.from, m.subject, m.preview, m.body].some((s) => s.toLowerCase().includes(term));
    });
  }, [q, filter]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Search" subtitle="Find messages, senders, and subjects" />
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail or tap the mic…" className="h-11 pl-10 pr-12" />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
          <MicButton onTranscript={(t) => setQ(t)} title="Speak to search" />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
        {categories.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>{categoryMeta[c].label}</FilterChip>
        ))}
      </div>
      <MessageList items={results} emptyText={q ? "No messages match your search." : "Start typing to search…"} />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-card text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}