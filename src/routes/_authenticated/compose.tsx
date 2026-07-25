import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Send, Paperclip, X, FileIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendGmailMessage } from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/compose")({
  head: () => ({ meta: [{ title: "Compose — ImpoMail" }, { name: "description", content: "Compose a new message." }] }),
  component: Compose,
});

function Compose() {
  const navigate = useNavigate();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<
    { filename: string; mimeType: string; dataBase64: string; size: number }[]
  >([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const send = useServerFn(sendGmailMessage);

  const MAX_TOTAL = 20 * 1024 * 1024; // 20MB

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const current = attachments.reduce((s, a) => s + a.size, 0);
    const added: typeof attachments = [];
    let total = current;
    for (const f of Array.from(files)) {
      total += f.size;
      if (total > MAX_TOTAL) { toast.error("Attachments exceed 20 MB total"); break; }
      const buf = new Uint8Array(await f.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
      added.push({
        filename: f.name,
        mimeType: f.type || "application/octet-stream",
        dataBase64: btoa(binary),
        size: f.size,
      });
    }
    if (added.length) setAttachments((prev) => [...prev, ...added]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!to || !subject) { toast.error("Please add a recipient and subject"); return; }
    setSending(true);
    try {
      await send({
        data: {
          to, subject, body,
          attachments: attachments.map(({ filename, mimeType, dataBase64 }) => ({ filename, mimeType, dataBase64 })),
        },
      });
      toast.success("Message sent");
      navigate({ to: "/sent" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
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
        {attachments.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
            {attachments.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{a.filename}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{(a.size / 1024).toFixed(1)} KB</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" /> Attach
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { toast.success("Draft saved"); navigate({ to: "/drafts" }); }}>Save draft</Button>
            <Button size="sm" className="gap-2" onClick={handleSend} disabled={sending} style={{ background: "var(--gradient-primary)" }}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}