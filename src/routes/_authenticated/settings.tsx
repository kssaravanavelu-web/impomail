import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { User, Bell, Shield, Palette, Sparkles, LogOut, Check, Home, Mail, Upload, ImageIcon, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/message-list";
import { toast } from "sonner";
import { ACCENTS, BACKGROUNDS, useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ImpoMail" }, { name: "description", content: "Manage your account and preferences." }] }),
  component: Settings,
});

function Settings() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [aiCategorize, setAiCategorize] = useState(true);
  const [otpVault, setOtpVault] = useState(true);
  const { accent, setAccent, contrast, setContrast, background, setBackground } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const onUploadBg = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      setBackground({ kind: "custom", dataUrl });
      toast.success("Custom background applied");
    };
    reader.readAsDataURL(file);
  };

  const connectGmail = () => {
    toast.info("Approve the Gmail connector prompt from Lovable to link your inbox.", { duration: 6000 });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "User";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="mb-4 flex items-center justify-between">
        <PageHeader title="Settings" />
        <Link to="/home" className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5">
        {avatar ? (
          <img src={avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-semibold">{name.charAt(0).toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{name}</div>
          <div className="truncate text-sm text-muted-foreground">{user.email}</div>
        </div>
      </div>

      <Section icon={Mail} title="Gmail">
        <div className="px-4 py-4">
          <div className="mb-2 text-sm font-medium">Connect your Gmail</div>
          <p className="mb-3 text-xs text-muted-foreground">
            Pull your real inbox into ImpoMail and auto-sort mail into Business, Jobs, OTP, Recharges and more. Your mail stays in your Google account — we don't copy it into a separate database.
          </p>
          <Button onClick={connectGmail} className="w-full gap-2" style={{ background: "var(--gradient-primary)" }}>
            <Mail className="h-4 w-4" /> Connect Gmail
          </Button>
        </div>
      </Section>

      <Section icon={Sparkles} title="Smart features">
        <Row label="AI categorization" desc="Auto-sort mail into Business, Jobs, OTP, etc." checked={aiCategorize} onChange={setAiCategorize} />
        <Row label="OTP Vault" desc="Extract and store OTP codes securely." checked={otpVault} onChange={setOtpVault} />
      </Section>

      <Section icon={Bell} title="Notifications">
        <Row label="Push notifications" desc="Get notified about important mail." checked={notifications} onChange={setNotifications} />
      </Section>

      <Section icon={Palette} title="Appearance">
        <div className="px-4 py-3">
          <div className="mb-2 text-sm font-medium">Accent color</div>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => {
              const active = a.key === accent;
              return (
                <button
                  key={a.key}
                  onClick={() => setAccent(a.key)}
                  title={a.label}
                  className={`relative h-9 w-9 rounded-full border-2 transition ${active ? "border-foreground scale-110" : "border-border/60"}`}
                  style={{ background: `oklch(0.62 ${a.chroma} ${a.hue})` }}
                >
                  {active && <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Contrast</div>
            <div className="text-xs text-muted-foreground">{contrast}</div>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Low</span><span>Default</span><span>High</span>
          </div>
        </div>
      </Section>

      <Section icon={ImageIcon} title="Aesthetic background">
        <div className="px-4 py-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Pick a preset or upload your own image.
          </p>
          <div className="mb-3 grid grid-cols-4 gap-2">
            <button
              onClick={() => setBackground({ kind: "none" })}
              title="None"
              className={`group relative flex aspect-square items-center justify-center rounded-lg border-2 transition ${background.kind === "none" ? "border-primary" : "border-border/60 hover:border-primary/40"}`}
            >
              <Ban className="h-4 w-4 text-muted-foreground" />
            </button>
            {BACKGROUNDS.map((b) => {
              const active = background.kind === "preset" && background.presetKey === b.key;
              return (
                <button
                  key={b.key}
                  onClick={() => setBackground({ kind: "preset", presetKey: b.key })}
                  title={b.label}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${active ? "border-primary" : "border-border/60 hover:border-primary/40"}`}
                  style={{ background: b.css, backgroundSize: "cover", backgroundPosition: "center" }}
                >
                  {active && <Check className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full bg-primary p-0.5 text-primary-foreground" />}
                </button>
              );
            })}
            <button
              onClick={() => fileRef.current?.click()}
              title="Upload"
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-[10px] transition ${background.kind === "custom" ? "border-primary text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}
            >
              <Upload className="h-4 w-4" /> Upload
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadBg(f);
              e.target.value = "";
            }}
          />
          {background.kind !== "none" && (
            <Button variant="outline" size="sm" onClick={() => setBackground({ kind: "none" })} className="w-full gap-2">
              <Ban className="h-3.5 w-3.5" /> Remove background
            </Button>
          )}
        </div>
      </Section>

      <Section icon={Shield} title="Account">
        <button className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent/40" onClick={() => toast.info("Coming soon")}>
          <span className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> Edit profile</span>
          <span className="text-muted-foreground">›</span>
        </button>
        <button className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent/40" onClick={() => toast.info("Coming soon")}>
          <span className="flex items-center gap-3"><Shield className="h-4 w-4 text-muted-foreground" /> Privacy & security</span>
          <span className="text-muted-foreground">›</span>
        </button>
      </Section>

      <Button variant="outline" className="mt-6 w-full gap-2 text-destructive hover:text-destructive" onClick={signOut}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>

      <p className="mt-6 text-center text-xs text-muted-foreground">ImpoMail v1.0 · Made with ♥</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

function Row({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}