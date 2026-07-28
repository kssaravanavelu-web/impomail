import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Bell, Shield, Palette, Sparkles, LogOut, Sun, Moon, Check, Home, Mail, Activity, Crown, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/message-list";
import { toast } from "sonner";
import { ACCENTS, useTheme } from "@/lib/theme";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUsage } from "@/lib/tier.functions";
import { TIERS } from "@/lib/tier";

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

  const usageFn = useServerFn(getCurrentUsage);
  const { data: usage } = useQuery({ queryKey: ["usage"], queryFn: () => usageFn() });

  const connectGmail = () => {
    navigate({ to: "/connect-gmail" });
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
          <Link
            to="/gmail-status"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            <Activity className="h-4 w-4" /> Connection status
          </Link>
        </div>
      </Section>

      <Section icon={Crown} title="Subscription & usage">
        <div className="px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Current plan</div>
            <div className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {usage ? TIERS[usage.tier].name : "Free"}
            </div>
          </div>
          <div className="space-y-3">
            <UsageBar label="Personal cards" current={usage?.cards.current ?? 0} limit={usage?.cards.limit ?? 3} />
            <UsageBar label="Groups" current={usage?.groups.current ?? 0} limit={usage?.groups.limit ?? 1} />
            <UsageBar
              label="AI messages this month"
              current={usage?.aiMessages.current ?? 0}
              limit={Number.isFinite(usage?.aiMessages.limit ?? 0) ? (usage?.aiMessages.limit ?? 0) : Infinity}
            />
          </div>
          <Link to="/pricing" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
            <CreditCard className="h-4 w-4" /> View plans
          </Link>
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

      <Section icon={Shield} title="Account & legal">
        <Link to="/profile" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent/40">
          <span className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> Edit profile</span>
          <span className="text-muted-foreground">›</span>
        </Link>
        <Link to="/privacy" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent/40">
          <span className="flex items-center gap-3"><Shield className="h-4 w-4 text-muted-foreground" /> Privacy Policy</span>
          <span className="text-muted-foreground">›</span>
        </Link>
        <Link to="/terms" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent/40">
          <span className="flex items-center gap-3"><Shield className="h-4 w-4 text-muted-foreground" /> Terms of Service</span>
          <span className="text-muted-foreground">›</span>
        </Link>
      </Section>

      <Button variant="outline" className="mt-6 w-full gap-2 text-destructive hover:text-destructive" onClick={signOut}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>

      <p className="mt-6 text-center text-xs text-muted-foreground">ImpoMail v1.0 · Founder: Saravanavel · Support Founder: Vishnuvardhan</p>
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

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const infinite = !Number.isFinite(limit);
  const pct = infinite ? 0 : Math.min(100, Math.round((current / limit) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {current}
          {infinite ? " / unlimited" : ` / ${limit}`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
        />
      </div>
    </div>
  );
}