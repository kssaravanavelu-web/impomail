import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGmailMessages } from "@/lib/gmail.functions";
import { GmailList } from "@/components/gmail-list";
import { PageHeader } from "@/components/message-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MicButton } from "@/components/mic-button";

const suggestions = [
  "OTP codes from today",
  "Interview invites this week",
  "Receipts from Airtel",
  "Unread jobs about Frontend",
];

function toGmailQuery(input: string): string {
  const s = input.toLowerCase().trim();
  const parts: string[] = [];
  if (/\botp\b|verification|code/.test(s)) parts.push("(OTP OR verification OR code)");
  if (/\bjob|interview|hiring|career/.test(s)) parts.push("(job OR interview OR hiring OR career)");
  if (/recharge|receipt|invoice|payment|order/.test(s)) parts.push("(receipt OR invoice OR payment OR order OR recharge)");
  if (/intern/.test(s)) parts.push("intern");
  if (/\btoday\b/.test(s)) parts.push("newer_than:1d");
  if (/this week|week/.test(s)) parts.push("newer_than:7d");
  if (/\bunread\b/.test(s)) parts.push("is:unread");
  const stop = new Set(["show","me","any","from","this","week","today","the","a","an","in","of","for","and","or","with","please","unread","otp","job","jobs","interview","interviews","recharge","recharges","receipt","receipts","invoice","invoices","payment","payments","order","orders","intern","interns","internship","internships","code","codes","verification"]);
  const extra = s.replace(/[^\w\s@.-]/g, " ").split(/\s+/).filter((w) => w && !stop.has(w));
  parts.push(...extra);
  return parts.join(" ").trim() || input;
}

export const Route = createFileRoute("/_authenticated/ai-search")({
  head: () => ({ meta: [{ title: "AI Search — ImpoMail" }, { name: "description", content: "Ask your inbox anything." }] }),
  component: AISearch,
});

function AISearch() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const list = useServerFn(listGmailMessages);
  const gmailQuery = submitted ? toGmailQuery(submitted) : "";
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai-search", gmailQuery],
    enabled: !!submitted,
    queryFn: () => list({ data: { q: gmailQuery, maxResults: 30 } }),
  });
  const results = data ?? [];
  const ran = !!submitted;
  const run = (text: string) => { setQ(text); setSubmitted(text); };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="AI Search" subtitle="Ask your inbox anything in plain English" />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-2">
        <Sparkles className="ml-2 h-5 w-5 text-primary" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setSubmitted(q); }}
          placeholder="e.g. Any OTPs from Google today?"
          className="h-11 border-0 bg-transparent focus-visible:ring-0"
        />
        <MicButton onTranscript={(t) => setQ(t)} onFinal={(t) => setSubmitted(t)} title="Speak your question" />
        <Button size="icon" onClick={() => setSubmitted(q)} style={{ background: "var(--gradient-primary)" }}>
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
            {isLoading
              ? `Searching your inbox for "${submitted}"…`
              : error
              ? `Search failed: ${error instanceof Error ? error.message : "unknown error"}`
              : results.length > 0
              ? `I found ${results.length} message${results.length === 1 ? "" : "s"} matching "${submitted}".`
              : `I couldn't find any messages matching "${submitted}". Try rephrasing.`}
          </div>
          <GmailList items={results} loading={isLoading} error={error instanceof Error ? error.message : null} emptyText="No matches." />
        </>
      )}
    </div>
  );
}