import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Play, Pause, Loader2, AlertCircle } from "lucide-react";
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

/** data: URLs are unreliable for <audio> seeking/duration — convert to a blob URL. */
function useAudioObjectUrl(src: string) {
  const [url, setUrl] = useState<string | null>(() => (src.startsWith("data:") ? null : src));
  useEffect(() => {
    if (!src.startsWith("data:")) {
      setUrl(src);
      return;
    }
    let objectUrl: string | null = null;
    try {
      const [meta, b64] = src.split(",");
      const mime = meta.slice(5).replace(";base64", "") || "audio/webm";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      setUrl(objectUrl);
    } catch {
      setUrl(src);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  return url;
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
  const [rate, setRate] = useState(1);
  const url = useAudioObjectUrl(src);

  const wave = useMemo(() => generateWave(filename ?? src.slice(-64), 40), [filename, src]);

  const toggle = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      const audio = audioRef.current;
      if (!audio || error) return;
      if (audio.paused) {
        // Pause any other playing voice note
        document.querySelectorAll("audio").forEach((el) => {
          if (el !== audio) el.pause();
        });
        void audio.play().catch(() => setError(true));
      } else {
        audio.pause();
      }
    },
    [error],
  );

  useEffect(() => {
    if (!url) return;
    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = "metadata";
    audio.src = url;

    const settle = (d: number) => {
      setLoading(false);
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };
    const onLoaded = () => {
      // MediaRecorder webm files report Infinity — force the browser to resolve it.
      if (!Number.isFinite(audio.duration) || audio.duration === 0) {
        const fix = () => {
          audio.currentTime = 0;
          audio.removeEventListener("timeupdate", fix);
          settle(audio.duration);
        };
        audio.addEventListener("timeupdate", fix);
        try {
          audio.currentTime = 1e101;
        } catch {
          settle(0);
        }
        setLoading(false);
        return;
      }
      settle(audio.duration);
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
    audio.addEventListener("durationchange", () => settle(audio.duration));
    audio.addEventListener("canplay", () => setLoading(false));
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.src = "";
    };
  }, [url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const progress = duration ? current / duration : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration || !Number.isFinite(duration)) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
  };

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        "group relative inline-flex w-full max-w-[280px] items-center gap-3 rounded-2xl px-3 py-2.5 backdrop-blur-sm",
        mine
          ? "bg-primary-foreground/10 text-primary-foreground ring-1 ring-primary-foreground/20"
          : "bg-primary/[0.07] text-foreground ring-1 ring-primary/15",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={error}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-all active:scale-95 disabled:opacity-50",
          mine
            ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {error ? (
          <AlertCircle className="h-4 w-4" />
        ) : loading && !playing ? (
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

        <div className="flex items-center justify-between gap-2 px-0.5">
          <span
            className={cn(
              "text-[10px] tabular-nums tracking-wide",
              mine ? "text-primary-foreground/80" : "text-muted-foreground",
            )}
          >
            {error ? "Unavailable" : formatDuration(current || duration || 0)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setRate((r) => (r === 1 ? 1.5 : r === 1.5 ? 2 : 1));
            }}
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums transition-colors",
              mine
                ? "bg-primary-foreground/15 text-primary-foreground/90 hover:bg-primary-foreground/25"
                : "bg-primary/10 text-muted-foreground hover:bg-primary/20",
            )}
            aria-label="Change playback speed"
          >
            {rate}×
          </button>
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
