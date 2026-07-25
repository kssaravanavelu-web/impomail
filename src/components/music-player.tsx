import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Royalty-free demo tracks (SoundHelix — free for demo use).
const TRACKS = [
  { title: "Ambient Reverie", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { title: "Midnight Silk", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
  { title: "Obsidian Drift", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
  { title: "Champagne Hours", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3" },
];

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.src = TRACKS[idx].url;
    if (playing) audioRef.current.play().catch(() => setPlaying(false));
  }, [idx]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      try {
        await a.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  const next = () => setIdx((i) => (i + 1) % TRACKS.length);

  return (
    <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-2 py-1 backdrop-blur">
      <Music className={cn("h-4 w-4 text-primary", playing && "animate-pulse")} />
      <span className="max-w-[110px] truncate text-[11px] text-foreground/80">
        {TRACKS[idx].title}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={toggle}
        aria-label={playing ? "Pause music" : "Play music"}
        title={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={next}
        aria-label="Next track"
        title="Next"
      >
        <SkipForward className="h-4 w-4" />
      </Button>
      <div className="hidden items-center gap-1 sm:flex">
        <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1 w-16 accent-primary"
          aria-label="Music volume"
        />
      </div>
      <audio ref={audioRef} preload="none" onEnded={next} />
    </div>
  );
}