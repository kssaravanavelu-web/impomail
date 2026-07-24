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

export type BackgroundPreset = { key: string; label: string; css: string; kind: "gradient" | "pattern" | "photo" };

export const BACKGROUNDS: BackgroundPreset[] = [
  { key: "aurora", label: "Aurora", kind: "gradient", css: "radial-gradient(1200px 800px at 10% 10%, #6366f1 0%, transparent 60%), radial-gradient(1000px 700px at 90% 20%, #ec4899 0%, transparent 55%), radial-gradient(900px 900px at 50% 100%, #06b6d4 0%, transparent 60%), #0b0f1a" },
  { key: "sunset", label: "Sunset", kind: "gradient", css: "linear-gradient(135deg, #ff6a3d 0%, #ff2e63 45%, #7a1cac 100%)" },
  { key: "ocean", label: "Ocean", kind: "gradient", css: "linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #0ea5e9 100%)" },
  { key: "forest", label: "Forest", kind: "gradient", css: "linear-gradient(160deg, #052e2b 0%, #065f46 50%, #10b981 100%)" },
  { key: "mesh", label: "Mesh", kind: "gradient", css: "radial-gradient(600px 400px at 20% 30%, #a78bfa 0%, transparent 60%), radial-gradient(700px 500px at 80% 70%, #f472b6 0%, transparent 60%), radial-gradient(500px 500px at 60% 20%, #38bdf8 0%, transparent 60%), #111827" },
  { key: "graphite", label: "Graphite", kind: "pattern", css: "repeating-linear-gradient(45deg, #1f2937 0 2px, #111827 2px 12px)" },
  { key: "paper", label: "Paper", kind: "pattern", css: "radial-gradient(#e5e7eb 1px, #fafaf9 1px) 0 0/16px 16px" },
  { key: "mint", label: "Mint", kind: "gradient", css: "linear-gradient(135deg, #a7f3d0 0%, #99f6e4 50%, #bae6fd 100%)" },
];

export type BackgroundState =
  | { kind: "none" }
  | { kind: "preset"; presetKey: string }
  | { kind: "custom"; dataUrl: string };

type ThemeState = {
  mode: ThemeMode;
  accent: string; // AccentPreset.key
  contrast: number; // 0..100 (50 = default)
  background: BackgroundState;
  setMode: (m: ThemeMode) => void;
  setAccent: (k: string) => void;
  setContrast: (n: number) => void;
  setBackground: (b: BackgroundState) => void;
  backgroundLocked: boolean; // theme toggle disabled when bg active
};

const ThemeContext = createContext<ThemeState | null>(null);
const KEY = "impomail.theme.v1";

function apply(mode: ThemeMode, accent: string, contrast: number, bg: BackgroundState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const bgActive = bg.kind !== "none";
  // When a custom background is active, force dark-neutral tokens so text stays readable
  // and lock the mode toggle. Otherwise honor the user's mode choice.
  const effectiveMode: ThemeMode = bgActive ? "dark" : mode;
  root.classList.remove("light", "dark");
  root.classList.add(effectiveMode);
  const preset = ACCENTS.find((a) => a.key === accent) ?? ACCENTS[0];
  root.style.setProperty("--accent-hue", String(preset.hue));
  root.style.setProperty("--accent-chroma", String(preset.chroma));
  // contrast 0..100 -> boost -0.06..+0.10 on foreground, opposite on bg
  const t = (contrast - 50) / 50; // -1..1
  root.style.setProperty("--contrast-boost", String(t.toFixed(3)));

  // App background layer
  let image = "none";
  if (bg.kind === "preset") {
    const p = BACKGROUNDS.find((b) => b.key === bg.presetKey);
    if (p) image = p.css;
  } else if (bg.kind === "custom") {
    image = `url("${bg.dataUrl}")`;
  }
  root.style.setProperty("--app-bg-image", image);
  root.dataset.bgActive = bgActive ? "true" : "false";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<string>("blue");
  const [contrast, setContrastState] = useState<number>(50);
  const [background, setBackgroundState] = useState<BackgroundState>({ kind: "none" });

  useEffect(() => {
    let m: ThemeMode = "dark";
    let a = "blue";
    let c = 50;
    let b: BackgroundState = { kind: "none" };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.mode) { m = s.mode; setModeState(s.mode); }
        if (s.accent) { a = s.accent; setAccentState(s.accent); }
        if (typeof s.contrast === "number") { c = s.contrast; setContrastState(s.contrast); }
        if (s.background && typeof s.background === "object") { b = s.background; setBackgroundState(s.background); }
      }
    } catch {}
    apply(m, a, c, b);
  }, []);

  const persist = (next: Partial<{ mode: ThemeMode; accent: string; contrast: number; background: BackgroundState }>) => {
    const m = next.mode ?? mode;
    const a = next.accent ?? accent;
    const c = next.contrast ?? contrast;
    const b = next.background ?? background;
    apply(m, a, c, b);
    try { localStorage.setItem(KEY, JSON.stringify({ mode: m, accent: a, contrast: c, background: b })); } catch {}
  };

  const setMode = (m: ThemeMode) => { setModeState(m); persist({ mode: m }); };
  const setAccent = (k: string) => { setAccentState(k); persist({ accent: k }); };
  const setContrast = (n: number) => { setContrastState(n); persist({ contrast: n }); };
  const setBackground = (b: BackgroundState) => { setBackgroundState(b); persist({ background: b }); };

  return (
    <ThemeContext.Provider value={{ mode, accent, contrast, background, backgroundLocked: background.kind !== "none", setMode, setAccent, setContrast, setBackground }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}