import { useEffect, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGmailMessages } from "@/lib/gmail.functions";
import { GmailList } from "@/components/gmail-list";
import { MicButton } from "@/components/mic-button";

export function HeaderSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const list = useServerFn(listGmailMessages);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const { data, isFetching, error } = useQuery({
    queryKey: ["gmail-search", debounced],
    queryFn: () => list({ data: { q: debounced, maxResults: 15 } }),
    enabled: debounced.length > 1,
  });

  const showPanel = open && debounced.length > 1;

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm transition focus-within:border-primary/60 hover:border-primary/50">
        {isFetching ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search mail…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button aria-label="Clear search" onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
        <MicButton onTranscript={(t) => { setQ(t); setOpen(true); }} title="Speak to search" />
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto">
          <GmailList
            items={data ?? []}
            loading={isFetching && !data}
            error={error ? "Search failed. Try again." : null}
            emptyText="No messages match your search."
          />
        </div>
      )}
    </div>
  );
}
