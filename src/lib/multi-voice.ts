// Parse assistant text into speakable segments and pick a distinct voice per role.
// Recognizes lines like `Alice: hello`, `**Bob**: hi`, `- Narrator: ...`.

export type Segment = { role: string; text: string; lang: string };

export function detectLang(text: string): string {
  const t = text || "";
  if (/[\u0B80-\u0BFF]/.test(t)) return "ta-IN";
  if (/[\u0900-\u097F]/.test(t)) return "hi-IN";
  if (/[\u0600-\u06FF]/.test(t)) return "ar-SA";
  if (/[\u4E00-\u9FFF]/.test(t)) return "zh-CN";
  if (/[\u3040-\u30FF]/.test(t)) return "ja-JP";
  if (/[\uAC00-\uD7AF]/.test(t)) return "ko-KR";
  if (/[\u0400-\u04FF]/.test(t)) return "ru-RU";
  if (/[àâçéèêëîïôûùüÿœæ]/i.test(t)) return "fr-FR";
  if (/[ñáéíóúü¿¡]/i.test(t)) return "es-ES";
  if (/[äöüß]/i.test(t)) return "de-DE";
  return "en-US";
}

const NARRATOR = "Narrator";
// Matches leading "Name:" or "**Name**:" (name = letters/spaces, 1–24 chars).
const ROLE_RX = /^\s*(?:[-*]\s*)?(?:\*\*)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ '\-]{0,23})(?:\*\*)?\s*:\s+(.+)$/;

export function parseDialogue(raw: string): Segment[] {
  const cleaned = (raw || "").replace(/```[\s\S]*?```/g, "").trim();
  if (!cleaned) return [];
  const lines = cleaned.split(/\n+/);
  const segs: Segment[] = [];
  let current: Segment | null = null;
  const push = (role: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    if (current && current.role === role) {
      current.text += " " + t;
      current.lang = detectLang(current.text);
    } else {
      current = { role, text: t, lang: detectLang(t) };
      segs.push(current);
    }
  };
  for (const line of lines) {
    const m = line.match(ROLE_RX);
    if (m) {
      const name = m[1].trim();
      // Skip markdown headings / common non-role labels
      if (/^(note|tip|warning|example|answer|question|q|a)$/i.test(name)) {
        push(NARRATOR, line);
      } else {
        push(name, m[2]);
      }
    } else {
      push(NARRATOR, line);
    }
  }
  return segs;
}

// Simple stable hash so a given role always gets the same voice this session.
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Score voices to prefer soft, natural, professional ones (Neural, Google, Microsoft Natural, Apple Siri).
function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = `${v.name} ${v.voiceURI}`.toLowerCase();
  let s = 0;
  if (/neural|natural|studio|wavenet|premium|enhanced/.test(n)) s += 40;
  if (/google/.test(n)) s += 20;
  if (/microsoft/.test(n)) s += 15;
  if (/samantha|ava|serena|siri|allison|aria|jenny|libby|sonia|nova|shimmer|zira/.test(n)) s += 30;
  if (/soft|calm|gentle|warm/.test(n)) s += 15;
  // Harsh / robotic voices go last.
  if (/compact|espeak|robot|fred|albert|ralph|junior|bad news|boing/.test(n)) s -= 60;
  if (/novelty|whisper|bells|cellos|organ|zarvox|trinoids|bahh/.test(n)) s -= 100;
  return s;
}

function langMatches(voiceLang: string, target: string): number {
  const a = voiceLang.toLowerCase();
  const b = target.toLowerCase();
  if (a === b) return 2;
  if (a.split("-")[0] === b.split("-")[0]) return 1;
  return 0;
}

export function pickVoiceForRole(
  voices: SpeechSynthesisVoice[],
  role: string,
  lang: string,
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  const filtered = voices
    .map((v) => ({ v, m: langMatches(v.lang, lang), s: scoreVoice(v) }))
    .filter((x) => x.m > 0)
    .sort((a, b) => b.m - a.m || b.s - a.s);
  const pool = (filtered.length ? filtered : voices.map((v) => ({ v, m: 0, s: scoreVoice(v) }))).map((x) => x.v);
  if (role === NARRATOR) return pool[0];
  // Pick deterministically by role hash, skipping index 0 (reserved for narrator) when possible.
  const idx = pool.length > 1 ? 1 + (hashStr(role) % (pool.length - 1)) : 0;
  return pool[idx];
}

// Soft, unhurried delivery. Roles vary only slightly so everything stays gentle.
export function voiceProfile(role: string): { rate: number; pitch: number } {
  if (role === NARRATOR) return { rate: 0.92, pitch: 1.02 };
  const h = hashStr(role);
  const pitch = 0.96 + ((h % 16) / 100); // 0.96 – 1.11
  const rate = 0.88 + (((h >> 3) % 8) / 100); // 0.88 – 0.95
  return { rate, pitch };
}

/** Soft playback volume so the assistant never feels loud. */
export const SOFT_VOLUME = 0.82;

export function stopSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** Speak text with per-role voices. Returns false when speech is unavailable. */
export function speakText(
  text: string,
  voices: SpeechSynthesisVoice[],
  onEnd?: () => void,
): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const segments = parseDialogue(text);
  if (!segments.length) return false;
  window.speechSynthesis.cancel();
  segments.forEach((seg, i) => {
    const u = new SpeechSynthesisUtterance(seg.text);
    u.lang = seg.lang;
    const voice = pickVoiceForRole(voices, seg.role, seg.lang);
    if (voice) u.voice = voice;
    const prof = voiceProfile(seg.role);
    u.rate = prof.rate;
    u.pitch = prof.pitch;
    u.volume = SOFT_VOLUME;
    if (i === segments.length - 1) {
      u.onend = () => onEnd?.();
      u.onerror = () => onEnd?.();
    }
    window.speechSynthesis.speak(u);
  });
  return true;
}