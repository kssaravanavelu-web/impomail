import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";
export type AccentPreset = { key: string; label: string; hue: number; chroma: number };

export const ACCENTS: AccentPreset[] = [
  { key: "champagne", label: "Champagne", hue: 85, chroma: 0.09 },
  { key: "gold", label: "Gold", hue: 75, chroma: 0.14 },
  { key: "platinum", label: "Platinum", hue: 250, chroma: 0.02 },
  { key: "obsidian", label: "Obsidian", hue: 260, chroma: 0.04 },
  { key: "burgundy", label: "Burgundy", hue: 15, chroma: 0.12 },
  { key: "british-racing", label: "Racing Green", hue: 155, chroma: 0.09 },
  { key: "midnight", label: "Midnight", hue: 240, chroma: 0.08 },
  { key: "indigo", label: "Indigo", hue: 268, chroma: 0.19 },
  { key: "blue", label: "Blue", hue: 258, chroma: 0.19 },
];

export type BackgroundPreset = { key: string; label: string; css: string; kind: "gradient" | "pattern" | "photo" };

export const BACKGROUNDS: BackgroundPreset[] = [
  { key: "obsidian", label: "Obsidian", kind: "gradient", css: "radial-gradient(1000px 700px at 15% 10%, #1a1815 0%, transparent 60%), radial-gradient(900px 700px at 85% 90%, #0f0d0a 0%, transparent 55%), #050505" },
  { key: "champagne", label: "Champagne Mist", kind: "gradient", css: "radial-gradient(1200px 800px at 20% 20%, rgba(201,168,76,0.18) 0%, transparent 55%), radial-gradient(900px 700px at 80% 80%, rgba(240,215,140,0.10) 0%, transparent 60%), #0a0908" },
  { key: "midnight-leather", label: "Midnight Leather", kind: "gradient", css: "linear-gradient(160deg, #0b0b10 0%, #14131a 55%, #1c1a22 100%)" },
  { key: "racing-green", label: "Racing Green", kind: "gradient", css: "linear-gradient(160deg, #050b08 0%, #0d1f18 55%, #133a2a 100%)" },
  { key: "burgundy", label: "Burgundy", kind: "gradient", css: "linear-gradient(160deg, #0a0505 0%, #1e0a0a 55%, #3a1418 100%)" },
  { key: "pinstripe", label: "Pinstripe", kind: "pattern", css: "repeating-linear-gradient(90deg, #0a0908 0 22px, #0d0c0a 22px 23px), #0a0908" },
  { key: "starlight", label: "Starlight", kind: "gradient", css: "radial-gradient(2px 2px at 20% 30%, rgba(240,215,140,0.6), transparent 60%), radial-gradient(1px 1px at 70% 50%, rgba(240,215,140,0.5), transparent 60%), radial-gradient(1.5px 1.5px at 40% 80%, rgba(240,215,140,0.55), transparent 60%), radial-gradient(1px 1px at 85% 20%, rgba(240,215,140,0.5), transparent 60%), #050505" },
  { key: "ivory", label: "Ivory", kind: "gradient", css: "linear-gradient(135deg, #f5efe0 0%, #ece3cc 55%, #d8caa4 100%)" },
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
};

const ThemeContext = createContext<ThemeState | null>(null);
const KEY = "impomail.theme.v1";

function apply(mode: ThemeMode, accent: string, contrast: number, bg: BackgroundState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const bgActive = bg.kind !== "none";
  root.classList.remove("light", "dark");
  root.classList.add(mode);
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
  const [accent, setAccentState] = useState<string>("champagne");
  const [contrast, setContrastState] = useState<number>(50);
  const [background, setBackgroundState] = useState<BackgroundState>({ kind: "none" });

  useEffect(() => {
    let m: ThemeMode = "dark";
    let a = "champagne";
    let c = 50;
    let b: BackgroundState = { kind: "none" };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.mode === "light" || s.mode === "dark") { m = s.mode; setModeState(s.mode); }
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
    <ThemeContext.Provider value={{ mode, accent, contrast, background, setMode, setAccent, setContrast, setBackground }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}