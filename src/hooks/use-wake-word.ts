import { useCallback, useEffect, useRef, useState } from "react";

type SR = { new (): SpeechRecognitionLike };
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
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

export type UseWakeWordOptions = {
  /** word that activates the assistant, lowercase */
  word?: string;
  lang?: string;
  /** fired when the wake word is heard; `rest` is anything spoken after it */
  onWake: (rest: string) => void;
  /** fired with continued speech after waking (dictation) */
  onDictate?: (text: string) => void;
};

export function useWakeWord({ word = "search", lang = "en-US", onWake, onDictate }: UseWakeWordOptions) {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [awake, setAwake] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const awakeRef = useRef(false);
  const stoppingRef = useRef(false);
  const cbRef = useRef({ onWake, onDictate });
  cbRef.current = { onWake, onDictate };

  useEffect(() => setSupported(!!getCtor()), []);

  const sleep = useCallback(() => {
    awakeRef.current = false;
    setAwake(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const Ctor = getCtor();
    if (!Ctor) return;
    let stopped = false;
    stoppingRef.current = false;

    const startRec = () => {
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (ev) => {
        let text = "";
        for (let i = ev.resultIndex ?? 0; i < ev.results.length; i++) {
          text += ev.results[i]?.[0]?.transcript ?? "";
        }
        const spoken = text.trim();
        if (!spoken) return;
        const lower = spoken.toLowerCase();
        if (!awakeRef.current) {
          const idx = lower.indexOf(word);
          if (idx === -1) return;
          awakeRef.current = true;
          setAwake(true);
          const rest = spoken.slice(idx + word.length).replace(/^[\s,.:;-]+/, "").trim();
          cbRef.current.onWake(rest);
        } else {
          const idx = lower.lastIndexOf(word);
          const rest = idx === -1 ? spoken : spoken.slice(idx + word.length).replace(/^[\s,.:;-]+/, "").trim();
          cbRef.current.onDictate?.(rest);
        }
      };
      rec.onerror = () => {};
      rec.onend = () => {
        if (stopped) return;
        // auto-restart so the wake word keeps working
        setTimeout(() => {
          if (!stopped) {
            try { rec.start(); } catch { /* already started */ }
          }
        }, 400);
      };
      recRef.current = rec;
      try { rec.start(); } catch { /* ignore */ }
    };

    startRec();
    return () => {
      stopped = true;
      awakeRef.current = false;
      setAwake(false);
      try { recRef.current?.abort(); } catch { /* ignore */ }
      recRef.current = null;
    };
  }, [enabled, lang, word]);

  const toggle = useCallback(() => setEnabled((e) => !e), []);

  return { enabled, setEnabled, toggle, supported, awake, sleep };
}