import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { messages } from "@/lib/mock-data";
import { MessageList, PageHeader } from "@/components/message-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MicButton } from "@/components/mic-button";

const suggestions = [
  "Show me OTP codes from today",
  "Any interview invites this week?",
  "Recharge receipts from Airtel",
  "Unread jobs matching Frontend",
];

export const Route = createFileRoute("/_authenticated/ai-search")({
  head: () => ({ meta: [{ title: "AI Search — ImpoMail" }, { name: "description", content: "Ask your inbox anything." }] }),
  component: AISearch,
});

function AISearch() {
  const [q, setQ] = useState("");
  const [ran, setRan] = useState(false);

  const run = (text: string) => { setQ(text); setRan(true); };

  const naive = q.toLowerCase();
  const results = messages.filter((m) => {
    if (!ran || !q.trim()) return false;
    if (naive.includes("otp")) return m.category === "otp";
    if (naive.includes("job") || naive.includes("interview")) return m.category === "jobs";
    if (naive.includes("recharge") || naive.includes("airtel") || naive.includes("jio")) return m.category === "recharges";
    if (naive.includes("intern")) return m.category === "internships";
    return [m.subject, m.body, m.from].some((s) => s.toLowerCase().includes(naive));
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="AI Search" subtitle="Ask your inbox anything in plain English" />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-2">
        <Sparkles className="ml-2 h-5 w-5 text-primary" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setRan(true); }}
          placeholder="e.g. Any OTPs from Google today?"
          className="h-11 border-0 bg-transparent focus-visible:ring-0"
        />
        <MicButton onTranscript={(t) => setQ(t)} onFinal={() => setRan(true)} title="Speak your question" />
        <Button size="icon" onClick={() => setRan(true)} style={{ background: "var(--gradient-primary)" }}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {!ran && (
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => run(s)} className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {ran && (
        <>
          <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
            <span className="font-medium text-primary">AI:</span>{" "}
            {results.length > 0
              ? `I found ${results.length} message${results.length === 1 ? "" : "s"} matching "${q}".`
              : `I couldn't find any messages matching "${q}". Try rephrasing.`}
          </div>
          <MessageList items={results} emptyText="No matches." />
        </>
      )}
    </div>
  );
}