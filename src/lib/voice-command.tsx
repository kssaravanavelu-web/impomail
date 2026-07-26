import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type SR = { new (): SpeechRecognitionLike };
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number }; resultIndex: number }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getCtor(): SR | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export type VoiceMode = "search" | "impo";

type Handlers = {
  /** wake word heard; `rest` is anything spoken right after it */
  onWake?: (rest: string) => void;
  /** continued dictation after waking */
  onDictate?: (text: string) => void;
  /** speech ended — final utterance for this mode */
  onFinal?: (text: string) => void;
  /** user said "end conversation" / "see you later" */
  onEndConversation?: () => void;
};

type VoiceCtx = {
  enabled: boolean;
  supported: boolean;
  mode: VoiceMode | null;
  /** true while in hands-free conversation mode (after "hello impo") */
  conversing: boolean;
  toggle: () => void;
  sleep: () => void;
  endConversation: () => void;
  register: (mode: VoiceMode, handlers: Handlers) => () => void;
};

const Ctx = createContext<VoiceCtx | null>(null);

const WAKE: { mode: VoiceMode; phrases: string[] }[] = [
  { mode: "impo", phrases: ["hello impo", "hey impo", "hello impu", "hey impu", "hello info", "hello impo mail"] },
  { mode: "search", phrases: ["search"] },
];

/** Phrases that leave conversation mode. */
const END_PHRASES = [
  "end conversation",
  "and conversation",
  "see you later",
  "stop conversation",
  "exit conversation",
  "goodbye impo",
  "bye impo",
];

function matchEnd(lower: string): number {
  for (const p of END_PHRASES) {
    const idx = lower.indexOf(p);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Finds the earliest wake phrase in the spoken text. */
function matchWake(lower: string): { mode: VoiceMode; end: number } | null {
  let best: { mode: VoiceMode; end: number; idx: number } | null = null;
  for (const { mode, phrases } of WAKE) {
    for (const p of phrases) {
      const idx = lower.indexOf(p);
      if (idx === -1) continue;
      if (!best || idx < best.idx) best = { mode, end: idx + p.length, idx };
    }
  }
  return best ? { mode: best.mode, end: best.end } : null;
}

export function VoiceCommandProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [mode, setMode] = useState<VoiceMode | null>(null);
  const modeRef = useRef<VoiceMode | null>(null);
  const [conversing, setConversing] = useState(false);
  const conversingRef = useRef(false);
  const handlersRef = useRef<Partial<Record<VoiceMode, Handlers>>>({});
  const lastTextRef = useRef("");

  useEffect(() => setSupported(!!getCtor()), []);

  const register = useCallback((m: VoiceMode, h: Handlers) => {
    handlersRef.current[m] = h;
    return () => {
      if (handlersRef.current[m] === h) delete handlersRef.current[m];
    };
  }, []);

  const sleep = useCallback(() => {
    const m = modeRef.current;
    const text = lastTextRef.current.trim();
    lastTextRef.current = "";
    // In conversation mode we stay awake so the user never repeats the wake word.
    if (!conversingRef.current) {
      modeRef.current = null;
      setMode(null);
    }
    if (m && text) handlersRef.current[m]?.onFinal?.(text);
  }, []);

  const endConversation = useCallback(() => {
    conversingRef.current = false;
    setConversing(false);
    lastTextRef.current = "";
    modeRef.current = null;
    setMode(null);
    handlersRef.current.impo?.onEndConversation?.();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const Ctor = getCtor();
    if (!Ctor) return;
    let stopped = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      // Longer window so slower / softer speakers aren't cut off mid-sentence.
      idleTimer = setTimeout(() => sleep(), 3000);
    };

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex ?? 0; i < ev.results.length; i++) {
        text += ev.results[i]?.[0]?.transcript ?? "";
      }
      const spoken = text.trim();
      if (!spoken) return;
      const lower = spoken.toLowerCase();
      if (conversingRef.current && matchEnd(lower) !== -1) {
        endConversation();
        return;
      }
      if (!modeRef.current) {
        const hit = matchWake(lower);
        if (!hit) return;
        modeRef.current = hit.mode;
        setMode(hit.mode);
        if (hit.mode === "impo") {
          conversingRef.current = true;
          setConversing(true);
        }
        const rest = spoken.slice(hit.end).replace(/^[\s,.:;-]+/, "").trim();
        lastTextRef.current = rest;
        handlersRef.current[hit.mode]?.onWake?.(rest);
        armIdle();
      } else {
        const hit = matchWake(lower);
        const rest = hit ? spoken.slice(hit.end).replace(/^[\s,.:;-]+/, "").trim() : spoken;
        lastTextRef.current = rest;
        handlersRef.current[modeRef.current]?.onDictate?.(rest);
        armIdle();
      }
    };
    rec.onerror = (ev) => {
      // Permission problems are fatal; transient errors just restart via onend.
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") stopped = true;
    };
    rec.onend = () => {
      if (stopped) return;
      setTimeout(() => {
        if (!stopped) {
          try { rec.start(); } catch { /* already started */ }
        }
      }, 150);
    };
    try { rec.start(); } catch { /* ignore */ }

    // Some browsers silently drop the stream when the tab is backgrounded.
    const onVisible = () => {
      if (!stopped && document.visibilityState === "visible") {
        try { rec.start(); } catch { /* already running */ }
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (idleTimer) clearTimeout(idleTimer);
      modeRef.current = null;
      lastTextRef.current = "";
      setMode(null);
      conversingRef.current = false;
      setConversing(false);
      try { rec.abort(); } catch { /* ignore */ }
    };
  }, [enabled, sleep, endConversation]);

  const toggle = useCallback(() => setEnabled((e) => !e), []);

  return (
    <Ctx.Provider value={{ enabled, supported, mode, conversing, toggle, sleep, endConversation, register }}>{children}</Ctx.Provider>
  );
}

export function useVoiceCommand() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useVoiceCommand must be used inside VoiceCommandProvider");
  return ctx;
}

/** Subscribe a component to one wake mode. */
export function useVoiceMode(mode: VoiceMode, handlers: Handlers) {
  const { register } = useVoiceCommand();
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(
    () =>
      register(mode, {
        onWake: (r) => ref.current.onWake?.(r),
        onDictate: (t) => ref.current.onDictate?.(t),
        onFinal: (t) => ref.current.onFinal?.(t),
        onEndConversation: () => ref.current.onEndConversation?.(),
      }),
    [mode, register],
  );
}