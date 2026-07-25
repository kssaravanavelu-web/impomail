import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, X, Send, Loader2, Maximize2, Volume2, VolumeX } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChatHistory, sendChatMessage } from "@/lib/assistant.functions";
import { MicButton } from "@/components/mic-button";
import { useVoiceMode } from "@/lib/voice-command";
import { parseSiteActions, stripSiteActions, type SiteAction } from "@/lib/site-commands";
import { speakText, stopSpeech } from "@/lib/multi-voice";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const history = useServerFn(listChatHistory);
  const send = useServerFn(sendChatMessage);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speakReply = useCallback(
    (text: string) => {
      const clean = stripSiteActions(text).trim();
      if (!clean) return;
      setSpeaking(true);
      const ok = speakText(clean, voices, () => setSpeaking(false));
      if (!ok) setSpeaking(false);
    },
    [voices],
  );

  const { data: messages } = useQuery({
    queryKey: ["chat-history"],
    queryFn: () => history(),
    enabled: open,
  });

  const runActions = useCallback(
    (actions: SiteAction[]) => {
      for (const a of actions) {
        if (a.type === "go") {
          navigate({ to: a.path });
          toast.info(`Opening ${a.path}`);
        } else if (a.type === "search") {
          window.dispatchEvent(new CustomEvent("impo:search", { detail: a.query }));
          toast.info(`Searching “${a.query}”`);
        } else if (a.type === "compose") {
          try {
            sessionStorage.setItem(
              "impo-compose-prefill",
              JSON.stringify({ to: a.to ?? "", subject: a.subject ?? "", body: a.body ?? "" }),
            );
          } catch { /* ignore */ }
          navigate({ to: "/compose" });
        }
      }
    },
    [navigate],
  );

  const mutation = useMutation({
    mutationFn: (content: string) => send({ data: { content } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["chat-history"] });
      const reply = (res as { reply?: string })?.reply ?? "";
      runActions(parseSiteActions(reply).actions);
      if (autoSpeakRef.current) speakReply(reply);
    },
  });

  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;
  const speakReplyRef = useRef(speakReply);
  speakReplyRef.current = speakReply;

  useEffect(() => {
    if (!open || !autoSpeak) stopSpeech();
    if (!open) setSpeaking(false);
  }, [open, autoSpeak]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending, open]);

  const mutateRef = useRef(mutation);
  mutateRef.current = mutation;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || mutation.isPending) return;
    setInput("");
    mutation.mutate(text);
  };

  // Wake word: "hello impo" (say it once) opens the widget and dictates into it.
  useVoiceMode("impo", {
    onWake: (rest) => {
      setOpen(true);
      setAutoSpeak(true);
      setInput(rest);
    },
    onDictate: (t) => setInput(t),
    onFinal: (t) => {
      const text = t.trim();
      setInput("");
      if (!text || mutateRef.current.isPending) return;
      setOpen(true);
      setAutoSpeak(true);
      mutateRef.current.mutate(text);
    },
  });

  return (
    <>
      {open && (
        <div className="fixed bottom-44 right-4 z-50 flex h-[min(60vh,540px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-primary/20 bg-card/90 backdrop-blur-xl lg:bottom-24 lg:right-6"
          style={{ boxShadow: "0 30px 80px -30px oklch(0 0 0 / 0.75)" }}>
          <div className="flex items-center gap-2 border-b border-primary/10 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--gradient-primary)" }}>
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Impo</p>
              <p className="truncate text-[11px] text-muted-foreground">Your ImpoMail concierge</p>
            </div>
            <Link to="/assistant" aria-label="Open full assistant" className="rounded-full p-1.5 text-muted-foreground hover:text-foreground">
              <Maximize2 className="h-4 w-4" />
            </Link>
            <button
              aria-label={autoSpeak ? "Mute spoken replies" : "Speak replies aloud"}
              title={autoSpeak ? "Voice replies on" : "Voice replies off"}
              onClick={() => {
                setAutoSpeak((v) => {
                  if (v) { stopSpeech(); setSpeaking(false); }
                  return !v;
                });
              }}
              className={cn(
                "rounded-full p-1.5 text-muted-foreground hover:text-foreground",
                autoSpeak && "text-primary",
                speaking && "animate-pulse",
              )}
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button aria-label="Close chat" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {(!messages || messages.length === 0) && !mutation.isPending && (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Ask me anything — mail tips, jokes, any language.
              </p>
            )}
            {messages?.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground",
                  )}
                >
                  {m.role === "assistant" ? stripSiteActions(m.content) : m.content}
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Impo is thinking…
              </div>
            )}
            {mutation.error && (
              <p className="text-xs text-destructive">{(mutation.error as Error).message}</p>
            )}
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-primary/10 px-3 py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Impo…"
              className="min-w-0 flex-1 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm outline-none focus:border-primary/60"
            />
            <MicButton onTranscript={(t) => setInput(t)} title="Speak to Impo" />
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim() || mutation.isPending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-foreground disabled:opacity-40"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Impo chat" : "Chat with Impo"}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground transition-transform hover:scale-105 lg:bottom-6 lg:right-6"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </>
  );
}
