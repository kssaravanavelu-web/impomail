import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, Sparkles, Trash2, Volume2, VolumeX, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listChatHistory, sendChatMessage, clearChatHistory } from "@/lib/assistant.functions";
import { MicButton } from "@/components/mic-button";
import { MusicPlayer } from "@/components/music-player";
import { parseDialogue, pickVoiceForRole, voiceProfile } from "@/lib/multi-voice";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Impo Assistant — ImpoMail" },
      { name: "description", content: "Chat with Impo, your personal ImpoMail concierge. Ask how anything works, get quick tips, or just say hi." },
      { property: "og:title", content: "Impo Assistant — ImpoMail" },
      { property: "og:description", content: "Your personal ImpoMail concierge — friendly, knowledgeable, and always dressed for the occasion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

type ChatMsg = { id: string; role: "user" | "assistant"; content: string; created_at?: string };

function Assistant() {
  const qc = useQueryClient();
  const listFn = useServerFn(listChatHistory);
  const sendFn = useServerFn(sendChatMessage);
  const clearFn = useServerFn(clearChatHistory);

  const { data: history, isLoading } = useQuery({
    queryKey: ["assistant-history"],
    queryFn: () => listFn(),
  });

  const [pending, setPending] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("impo-assistant-muted") === "1";
  });
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const messages: ChatMsg[] = useMemo(() => {
    return [...(history ?? []), ...pending];
  }, [history, pending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("impo-assistant-muted", muted ? "1" : "0");
      if (muted) stopSpeaking();
    }
  }, [muted]);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  };

  const speak = (id: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Your browser doesn't support speech");
      return;
    }
    if (muted) {
      toast.info("Unmute to hear the assistant");
      return;
    }
    if (speakingId === id) {
      stopSpeaking();
      return;
    }
    window.speechSynthesis.cancel();
    const segments = parseDialogue(text);
    if (!segments.length) return;
    setSpeakingId(id);
    segments.forEach((seg, i) => {
      const u = new SpeechSynthesisUtterance(seg.text);
      u.lang = seg.lang;
      const voice = pickVoiceForRole(voices, seg.role, seg.lang);
      if (voice) u.voice = voice;
      const prof = voiceProfile(seg.role);
      u.rate = prof.rate;
      u.pitch = prof.pitch;
      u.volume = 1;
      if (i === segments.length - 1) {
        u.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
        u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
      }
      window.speechSynthesis.speak(u);
    });
  };

  const mutation = useMutation({
    mutationFn: async (content: string) => sendFn({ data: { content } }),
    onMutate: (content) => {
      const userMsg: ChatMsg = { id: `local-u-${Date.now()}`, role: "user", content };
      const typing: ChatMsg = { id: `local-a-${Date.now()}`, role: "assistant", content: "…" };
      setPending((p) => [...p, userMsg, typing]);
    },
    onSuccess: async () => {
      setPending([]);
      await qc.invalidateQueries({ queryKey: ["assistant-history"] });
    },
    onError: (e: unknown) => {
      setPending([]);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    },
    onSettled: () => textareaRef.current?.focus(),
  });

  const clearMutation = useMutation({
    mutationFn: async () => clearFn(),
    onSuccess: async () => {
      stopSpeaking();
      await qc.invalidateQueries({ queryKey: ["assistant-history"] });
      toast.success("Conversation cleared");
    },
  });

  const submit = () => {
    const text = input.trim();
    if (!text || mutation.isPending) return;
    setInput("");
    mutation.mutate(text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const suggestions = [
    "How do I connect my Gmail?",
    "Where do I attach files?",
    "Tell me a quick joke",
    "What can ImpoMail do?",
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col px-4 py-6 lg:px-8 lg:py-10">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Impo</h1>
            <p className="text-xs text-muted-foreground">Your ImpoMail concierge · Speaks any language</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <MusicPlayer />
          <Button
            variant="ghost"
            size="icon"
            aria-label={muted ? "Unmute assistant voice" : "Mute assistant voice"}
            title={muted ? "Unmute voice" : "Mute voice"}
            onClick={() => setMuted((m) => !m)}
            className={cn(muted && "text-destructive")}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Clear conversation"
            title="Clear conversation"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending || (history?.length ?? 0) === 0}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="glass-card flex-1 overflow-y-auto rounded-2xl border border-primary/10 p-4 lg:p-6"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your conversation…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Hello — I'm Impo</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Ask me anything about ImpoMail, or just chat. I promise not to leave crumbs on the keyboard.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => {
              const isUser = m.role === "user";
              const isTyping = !isUser && m.content === "…" && mutation.isPending;
              return (
                <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                  <div className={cn("group max-w-[85%] space-y-1")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                        isUser
                          ? "text-primary-foreground shadow-md"
                          : "border border-border/60 bg-card/70 text-foreground",
                      )}
                      style={isUser ? { background: "var(--gradient-primary)" } : undefined}
                    >
                      {isTyping ? (
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Impo is thinking…
                        </span>
                      ) : (
                        stripSiteActions(m.content)
                      )}
                    </div>
                    {!isUser && !isTyping && (
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => speak(m.id, stripSiteActions(m.content))}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                          aria-label={speakingId === m.id ? "Stop speaking" : "Speak this reply"}
                          title={muted ? "Unmute to hear" : speakingId === m.id ? "Stop" : "Speak"}
                        >
                          {speakingId === m.id ? (
                            <><Square className="h-3 w-3" /> Stop</>
                          ) : (
                            <><Volume2 className="h-3 w-3" /> Speak</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-primary/10 bg-card/70 p-2 backdrop-blur">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Impo anything about ImpoMail…"
          className="min-h-[52px] resize-none border-0 bg-transparent focus-visible:ring-0"
          disabled={mutation.isPending}
        />
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="text-[11px] text-muted-foreground">
            {muted ? "Voice muted" : "Voice ready · tap Speak on any reply"} · Enter to send
          </span>
          <div className="flex items-center gap-1">
          <MicButton
            size="sm"
            onTranscript={(t) => setInput(t)}
            title="Speak your message"
          />
          <Button
            size="sm"
            className="gap-2"
            onClick={submit}
            disabled={mutation.isPending || !input.trim()}
            style={{ background: "var(--gradient-primary)" }}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
          </div>
        </div>
      </div>
    </div>
  );
}