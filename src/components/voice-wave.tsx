import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function generateWave(seed: string, bars = 36): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    h = (h * 31 + i * 17) % 997;
    out.push(0.25 + (h % 100) / 200); // 0.25 .. 0.75
  }
  return out;
}

export function VoiceWave({
  src,
  filename,
  mine = false,
  className,
}: {
  src: string;
  filename?: string;
  mine?: boolean;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const id = useRef(`voice-${Math.random().toString(36).slice(2)}`).current;

  const wave = useRef(generateWave(filename ?? src, 40)).current;

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (audio.paused) {
      audio.play().catch(() => setError(true));
    } else {
      audio.pause();
    }
  }, [error]);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.preload = "metadata";

    const onLoaded = () => {
      setLoading(false);
      setDuration(audio.duration || 0);
    };
    const onTime = () => setCurrent(audio.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
      audio.currentTime = 0;
    };
    const onError = () => {
      setLoading(false);
      setError(true);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    // Force load on mobile
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  const progress = duration ? current / duration : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
  };

  return (
    <div
      className={cn(
        "group relative inline-flex w-full max-w-[260px] items-center gap-2.5 rounded-2xl px-2.5 py-2 shadow-sm",
        mine ? "bg-primary text-primary-foreground rounded-br-md" : "border border-primary/15 bg-primary/[0.06] text-foreground rounded-bl-md",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={loading || error}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
          mine
            ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current pl-0.5" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          className="relative h-7 cursor-pointer overflow-hidden"
          onClick={seek}
          onTouchStart={seek}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(current)}
          aria-label="Voice playback position"
          tabIndex={0}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${wave.length} 24`}
          >
            {wave.map((h, i) => {
              const active = i / wave.length < progress;
              const x = i + 0.5;
              const barHeight = Math.max(3, h * 22);
              const y = 12 - barHeight / 2;
              return (
                <rect
                  key={i}
                  x={x - 0.35}
                  y={y}
                  width={0.7}
                  height={barHeight}
                  rx={0.35}
                  className={cn(
                    "transition-all duration-200",
                    active
                      ? mine ? "fill-primary-foreground" : "fill-primary"
                      : mine ? "fill-primary-foreground/35" : "fill-primary/30",
                  )}
                />
              );
            })}
          </svg>
          {/* Progress head */}
          <div
            className={cn(
              "pointer-events-none absolute top-0 h-full w-0.5 rounded-full transition-all",
              mine ? "bg-primary-foreground" : "bg-primary",
            )}
            style={{ left: `${progress * 100}%`, opacity: playing ? 1 : 0.6 }}
          />
        </div>

        <div className="flex items-center justify-between px-0.5">
          <span
            className={cn(
              "text-[10px] tabular-nums tracking-wide",
              mine ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            {error ? "--:--" : formatDuration(current || duration || 0)}
          </span>
          <span
            className={cn(
              "text-[10px] tabular-nums tracking-wide",
              mine ? "text-primary-foreground/70" : "text-muted-foreground/80",
            )}
          >
            {formatDuration(duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function VoiceRecorderWave({ seconds, className }: { seconds: number; className?: string }) {
  const bars = 24;
  const [heights, setHeights] = useState(() => Array.from({ length: bars }, () => 0.3));

  useEffect(() => {
    let raf: number;
    const update = () => {
      setHeights((prev) => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * bars);
        next[idx] = 0.25 + Math.random() * 0.55;
        // Smooth neighbors
        if (idx > 0) next[idx - 1] = Math.max(0.2, next[idx] - 0.15);
        if (idx < bars - 1) next[idx + 1] = Math.max(0.2, next[idx] - 0.15);
        return next;
      });
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={cn("flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-primary-foreground animate-pulse", className)}>
      <div className="flex h-5 items-center gap-[3px]">
        {heights.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-current transition-all duration-150"
            style={{ height: `${h * 100}%` }}
          />
        ))}
      </div>
      <span className="text-xs tabular-nums">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </span>
    </div>
  );
}
