import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

type Props = {
  onTranscript: (text: string) => void;
  onFinal?: (text: string) => void;
  size?: "sm" | "icon";
  className?: string;
  title?: string;
};

export function MicButton({ onTranscript, onFinal, size = "icon", className, title }: Props) {
  const lastToastRef = useRef<string>("");
  const { listening, supported, error, toggle } = useSpeechRecognition({
    onInterim: onTranscript,
    onFinal: (t) => {
      onTranscript(t);
      onFinal?.(t);
    },
  });

  useEffect(() => {
    if (error && error !== lastToastRef.current) {
      lastToastRef.current = error;
      if (error !== "no-speech" && error !== "aborted") toast.error(`Mic: ${error}`);
    }
  }, [error]);

  const handleClick = () => {
    if (!supported) {
      toast.error("Voice input isn't supported in this browser");
      return;
    }
    toggle();
  };

  return (
    <Button
      type="button"
      variant={listening ? "default" : "ghost"}
      size={size}
      onClick={handleClick}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={title ?? (listening ? "Listening — tap to stop" : "Speak to search")}
      className={cn(listening && "animate-pulse", className)}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}