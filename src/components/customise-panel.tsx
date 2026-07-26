import { useState } from "react";
import { Check, Moon, Palette, Sparkles, Sun, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ACCENTS, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * "Customise web" — a luxury control panel for the app's appearance.
 * Opens from the top bar and drives the existing ThemeProvider state.
 */
export function CustomisePanel() {
  const [open, setOpen] = useState(false);
  const { mode, setMode, accent, setAccent, contrast, setContrast } = useTheme();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Customise web"
          className="lux-chip group flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium tracking-wide sm:px-4"
        >
          <SlidersHorizontal className="h-4 w-4 text-primary transition-transform duration-500 group-hover:rotate-90" />
          <span className="hidden sm:inline">Customise</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full border-l border-primary/15 bg-background/80 backdrop-blur-2xl sm:max-w-sm">
        <span className="ambient-glow -right-10 -top-14 h-48 w-48" aria-hidden />
        <SheetHeader className="relative">
          <SheetTitle className="flex items-center gap-2 font-display text-2xl">
            <Sparkles className="h-5 w-5 text-primary" /> Customise web
          </SheetTitle>
          <SheetDescription>Tailor the finish of ImpoMail to your taste.</SheetDescription>
        </SheetHeader>
        <div className="rr-hairline my-1" />

        <div className="relative space-y-7 overflow-y-auto px-4 pb-10">
          <section>
            <Label icon={Sun} text="Ambience" />
            <div className="grid grid-cols-2 gap-2">
              {(["light", "dark"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm capitalize transition-all duration-500",
                    mode === m
                      ? "border-primary/60 bg-primary/10 text-foreground shadow-[var(--shadow-glow)]"
                      : "border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-accent/40",
                  )}
                >
                  {m === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {m}
                </button>
              ))}
            </div>
          </section>

          <section>
            <Label icon={Palette} text="Signature accent" />
            <div className="grid grid-cols-5 gap-3">
              {ACCENTS.map((a) => {
                const active = a.key === accent;
                return (
                  <button
                    key={a.key}
                    onClick={() => setAccent(a.key)}
                    title={a.label}
                    aria-label={a.label}
                    className={cn(
                      "relative aspect-square rounded-full border transition-all duration-500",
                      active ? "scale-110 border-foreground/80" : "border-border/50 hover:scale-105",
                    )}
                    style={{
                      background: `radial-gradient(circle at 30% 25%, oklch(0.9 ${a.chroma} ${a.hue}), oklch(0.6 ${a.chroma} ${a.hue}))`,
                    }}
                  >
                    {active && <Check className="absolute inset-0 m-auto h-4 w-4 text-primary-foreground" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {ACCENTS.find((a) => a.key === accent)?.label} finish
            </p>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <Label icon={SlidersHorizontal} text="Contrast" className="mb-0" />
              <span className="text-xs tabular-nums text-muted-foreground">{contrast}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Soft</span><span>Balanced</span><span>Sharp</span>
            </div>
          </section>

          <div className="glass-card rounded-2xl p-4">
            <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Live preview</div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full" style={{ background: "var(--gradient-primary)" }} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-base leading-tight">ImpoMail</div>
                <div className="truncate text-xs text-muted-foreground">Your inbox, tailored.</div>
              </div>
              <span className="glow-dot" />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Label({ icon: Icon, text, className }: { icon: typeof Sun; text: string; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground", className)}>
      <Icon className="h-3.5 w-3.5 text-primary" /> {text}
    </div>
  );
}