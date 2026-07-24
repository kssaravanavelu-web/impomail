import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";
export type AccentPreset = { key: string; label: string; hue: number; chroma: number };

export const ACCENTS: AccentPreset[] = [
  { key: "indigo", label: "Indigo", hue: 268, chroma: 0.19 },
  { key: "blue", label: "Blue", hue: 258, chroma: 0.19 },
  { key: "cyan", label: "Cyan", hue: 220, chroma: 0.15 },
  { key: "emerald", label: "Emerald", hue: 155, chroma: 0.17 },
  { key: "amber", label: "Amber", hue: 75, chroma: 0.17 },
  { key: "rose", label: "Rose", hue: 15, chroma: 0.2 },
  { key: "pink", label: "Pink", hue: 350, chroma: 0.2 },
  { key: "violet", label: "Violet", hue: 300, chroma: 0.2 },
];

type ThemeState = {
  mode: ThemeMode;
  accent: string; // AccentPreset.key
  contrast: number; // 0..100 (50 = default)
  setMode: (m: ThemeMode) => void;
  setAccent: (k: string) => void;
  setContrast: (n: number) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);
const KEY = "impomail.theme.v1";

function apply(mode: ThemeMode, accent: string, contrast: number) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  const preset = ACCENTS.find((a) => a.key === accent) ?? ACCENTS[0];
  root.style.setProperty("--accent-hue", String(preset.hue));
  root.style.setProperty("--accent-chroma", String(preset.chroma));
  // contrast 0..100 -> boost -0.06..+0.10 on foreground, opposite on bg
  const t = (contrast - 50) / 50; // -1..1
  root.style.setProperty("--contrast-boost", String(t.toFixed(3)));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<string>("blue");
  const [contrast, setContrastState] = useState<number>(50);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.mode) setModeState(s.mode);
        if (s.accent) setAccentState(s.accent);
        if (typeof s.contrast === "number") setContrastState(s.contrast);
        apply(s.mode ?? "dark", s.accent ?? "blue", s.contrast ?? 50);
        return;
      }
    } catch {}
    apply("dark", "blue", 50);
  }, []);

  const persist = (next: Partial<{ mode: ThemeMode; accent: string; contrast: number }>) => {
    const m = next.mode ?? mode;
    const a = next.accent ?? accent;
    const c = next.contrast ?? contrast;
    apply(m, a, c);
    try { localStorage.setItem(KEY, JSON.stringify({ mode: m, accent: a, contrast: c })); } catch {}
  };

  const setMode = (m: ThemeMode) => { setModeState(m); persist({ mode: m }); };
  const setAccent = (k: string) => { setAccentState(k); persist({ accent: k }); };
  const setContrast = (n: number) => { setContrastState(n); persist({ contrast: n }); };

  return (
    <ThemeContext.Provider value={{ mode, accent, contrast, setMode, setAccent, setContrast }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}