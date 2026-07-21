import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Bell, Shield, Palette, Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/message-list";
import { toast } from "sonner";

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
  const [darkMode, setDarkMode] = useState(true);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "User";
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Settings" />

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

      <Section icon={Sparkles} title="Smart features">
        <Row label="AI categorization" desc="Auto-sort mail into Business, Jobs, OTP, etc." checked={aiCategorize} onChange={setAiCategorize} />
        <Row label="OTP Vault" desc="Extract and store OTP codes securely." checked={otpVault} onChange={setOtpVault} />
      </Section>

      <Section icon={Bell} title="Notifications">
        <Row label="Push notifications" desc="Get notified about important mail." checked={notifications} onChange={setNotifications} />
      </Section>

      <Section icon={Palette} title="Appearance">
        <Row label="Dark mode" desc="Use the dark ImpoMail theme." checked={darkMode} onChange={setDarkMode} />
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