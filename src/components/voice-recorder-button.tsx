import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VoiceRecorderWave } from "./voice-wave";

export type RecordedVoice = {
  filename: string;
  mimeType: string;
  dataBase64: string;
  size: number;
};

function toBase64(buf: Uint8Array) {
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

export function VoiceRecorderButton({ onRecorded }: { onRecorded: (v: RecordedVoice) => void }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Voice recording isn't supported in this browser");
      return;
    }
    try {
      setBusy(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        setRecording(false);
        setSeconds(0);
        if (blob.size < 500) {
          toast.error("Recording too short");
          return;
        }
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const buf = new Uint8Array(await blob.arrayBuffer());
        onRecorded({
          filename: `voice-message-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`,
          mimeType: type.split(";")[0],
          dataBase64: toBase64(buf),
          size: blob.size,
        });
        toast.success("Voice message attached");
      };
      recRef.current = rec;
      rec.start();
      setSeconds(0);
      setRecording(true);
    } catch {
      toast.error("Microphone permission denied");
    } finally {
      setBusy(false);
    }
  }, [onRecorded]);

  useEffect(() => () => recRef.current?.stream?.getTracks().forEach((t) => t.stop()), []);

  return (
    <div className="flex items-center">
      {recording ? (
        <button
          type="button"
          onClick={stop}
          aria-label="Stop recording and attach voice mail"
          title="Stop and attach"
          className="flex items-center gap-2 rounded-full bg-primary px-1.5 py-1.5 text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/20">
            <Square className="h-3.5 w-3.5 fill-current" />
          </span>
          <VoiceRecorderWave seconds={seconds} />
        </button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={start}
          aria-label="Record voice mail"
          title="Record voice mail"
          className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-primary"
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}