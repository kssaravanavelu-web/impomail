import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/compose")({
  head: () => ({ meta: [{ title: "Compose — ImpoMail" }, { name: "description", content: "Compose a new message." }] }),
  component: Compose,
});

function Compose() {
  const navigate = useNavigate();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const send = () => {
    if (!to || !subject) { toast.error("Please add a recipient and subject"); return; }
    toast.success("Message sent");
    navigate({ to: "/sent" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">New message</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/home" })}><X className="h-5 w-5" /></Button>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <label className="w-16 text-xs font-medium uppercase text-muted-foreground">To</label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" className="border-0 bg-transparent focus-visible:ring-0" />
          </div>
          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
            <label className="w-16 text-xs font-medium uppercase text-muted-foreground">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this about?" className="border-0 bg-transparent focus-visible:ring-0" />
          </div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" className="min-h-[280px] resize-none border-0 bg-transparent focus-visible:ring-0" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => toast.info("Attachments coming soon")}><Paperclip className="h-4 w-4" /> Attach</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { toast.success("Draft saved"); navigate({ to: "/drafts" }); }}>Save draft</Button>
            <Button size="sm" className="gap-2" onClick={send} style={{ background: "var(--gradient-primary)" }}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}