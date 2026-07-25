import { useCallback, useEffect, useRef, useState } from "react";

type SR = {
  new (): SpeechRecognitionLike;
};
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export type UseSpeechRecognitionOptions = {
  onFinal?: (text: string) => void;
  onInterim?: (text: string) => void;
  lang?: string;
  continuous?: boolean;
};

export function useSpeechRecognition(opts: UseSpeechRecognitionOptions = {}) {
  const { onFinal, onInterim, lang = "en-US", continuous = false } = opts;
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Speech recognition not supported in this browser");
      return;
    }
    setError(null);
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < ev.results.length; i++) {
        const res = ev.results[i] as ArrayLike<{ transcript: string }> & { isFinal?: boolean };
        const chunk = res[0]?.transcript ?? "";
        if ((res as { isFinal?: boolean }).isFinal) finalText += chunk;
        else interimText += chunk;
      }
      if (interimText && onInterim) onInterim(interimText);
      if (finalText && onFinal) onFinal(finalText);
    };
    rec.onerror = (ev) => {
      setError(ev.error || "mic error");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang, continuous, onFinal, onInterim]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => recRef.current?.abort(), []);

  return { listening, supported, error, start, stop, toggle };
}