import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Bell, Shield, Palette, Sparkles, LogOut, Sun, Moon, Check, Home, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/message-list";
import { toast } from "sonner";
import { ACCENTS, useTheme } from "@/lib/theme";

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
  const { mode, setMode, accent, setAccent, contrast, setContrast, background, setBackground } = useTheme();
  // Ensure no aesthetic background is applied since we removed that feature
  useEffect(() => { if (background.kind !== "none") setBackground({ kind: "none" }); }, [background.kind, setBackground]);

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

      <Link
        to="/profile"
        className="mb-4 flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition hover:border-primary/40"
      >
        {avatar ? (
          <img src={avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-semibold">{name.charAt(0).toUpperCase()}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{name}</div>
          <div className="truncate text-sm text-muted-foreground">{user.email}</div>
        </div>
        <span className="text-muted-foreground">›</span>
      </Link>

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
          <div className="mb-2 text-sm font-medium">Theme</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("light")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${mode === "light" ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:bg-accent/40"}`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
            <button
              onClick={() => setMode("dark")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${mode === "dark" ? "border-primary bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground hover:bg-accent/40"}`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
          </div>
        </div>
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
                  style={{ background: `oklch(0.72 ${a.chroma} ${a.hue})` }}
                >
                  {active && <Check className="absolute inset-0 m-auto h-4 w-4 text-primary-foreground" />}
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

      <Section icon={Shield} title="Account">
        <Link to="/profile" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent/40">
          <span className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> Edit profile</span>
          <span className="text-muted-foreground">›</span>
        </Link>
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