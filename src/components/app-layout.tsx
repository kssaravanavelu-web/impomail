import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Inbox, Send, FileText, Trash2, Archive, Settings, PenSquare, LogOut, Menu, Home, User, Bot, IdCard } from "lucide-react";
import { HeaderSearch } from "@/components/header-search";
import { NotificationBell } from "@/components/notification-bell";
import { ChatWidget } from "@/components/chat-widget";
import { CustomisePanel } from "@/components/customise-panel";
import { VoiceCommandProvider } from "@/lib/voice-command";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

type SidebarItem = {
  to: "/compose" | "/home" | "/inbox" | "/cards" | "/sent" | "/drafts" | "/trash" | "/archive" | "/settings" | "/profile" | "/assistant";
  label: string;
  icon: typeof Inbox;
  accent?: boolean;
};
const sidebarItems: SidebarItem[] = [
  { to: "/compose", label: "Compose", icon: PenSquare, accent: true },
  { to: "/home", label: "Home", icon: Home },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/cards", label: "Cards & Groups", icon: IdCard },
  { to: "/sent", label: "Sent", icon: Send },
  { to: "/drafts", label: "Drafts", icon: FileText },
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/archive", label: "Archive", icon: Archive },
  { to: "/assistant", label: "Assistant", icon: Bot },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

const bottomItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/assistant", label: "Impo", icon: Bot },
  { to: "/compose", label: "Compose", icon: PenSquare },
  { to: "/cards", label: "Cards", icon: IdCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState<string>("?");

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || ignore) return;
      const fallback = ((user.user_metadata?.full_name as string | undefined) ?? user.email ?? "?").charAt(0).toUpperCase();
      setInitial(fallback);
      const metaAvatar = (user.user_metadata?.avatar_url as string | undefined) ?? null;
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();
      if (ignore) return;
      const name = data?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "?";
      setInitial(name.charAt(0).toUpperCase());
      setAvatarUrl(data?.avatar_url ?? metaAvatar ?? null);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") load();
    });
    return () => {
      ignore = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <VoiceCommandProvider>
    <div className="app-shell min-h-screen bg-background text-foreground">
      <span className="aurora-field" aria-hidden />
      <span className="mesh-floor" aria-hidden />
      {/* Drawer (mobile) */}
      <aside
        className={cn(
          "holo-pane fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <span className="ambient-glow -top-16 -left-10 h-40 w-40" aria-hidden />
        <Link
          to="/home"
          onClick={() => setOpen(false)}
          className="flex h-16 items-center gap-2 border-b border-border/60 px-5 transition-colors hover:opacity-80"
        >
          <BrandLogo className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-bold tracking-tight">
            Impo<span className="text-primary">Mail</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1 p-3">
          {sidebarItems.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            if (item.accent) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="mb-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02]"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "edge-lit flex items-center gap-3 rounded-xl border border-transparent px-4 py-2.5 text-sm",
                  active ? "nav-capsule" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-3 bottom-3">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div>
        <header className="lux-bar neon-rail sticky top-0 z-20 flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/home" className="hidden shrink-0 items-center gap-2 transition-opacity hover:opacity-80 lg:flex">
            <BrandLogo className="h-9 w-9 rounded-xl" />
            <span className="lux-wordmark text-lg font-bold tracking-tight">
              Impo<span className="text-primary">Mail</span>
            </span>
          </Link>
          <div className="flex flex-1 items-center gap-2 lg:max-w-sm lg:justify-start">
            <HeaderSearch />
          </div>
          <div className="flex items-center gap-1.5">
            <CustomisePanel />
            <NotificationBell />
            <Button variant="ghost" size="icon" asChild aria-label="Settings">
              <Link to="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <Link
              to="/profile"
              aria-label="Profile"
              className="silk-hover ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-card text-xs font-semibold shadow-[0_0_0_1px_oklch(0.85_var(--accent-chroma)_var(--accent-hue)/0.08),0_8px_24px_-12px_oklch(0.85_var(--accent-chroma)_var(--accent-hue)/0.5)] hover:border-primary"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setAvatarUrl(null)}
                />
              ) : (
                <span>{initial}</span>
              )}
            </Link>
          </div>
        </header>

        {/* Top nav (desktop) */}
        <nav className="lux-bar neon-rail sticky top-16 z-10 hidden lg:block">
          <div className="flex items-center gap-1 overflow-x-auto px-8 py-2">
            {sidebarItems.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              if (item.accent) {
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="mr-2 flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.03]"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              }
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "edge-lit flex shrink-0 items-center gap-2 rounded-full border border-transparent px-3.5 py-2 text-sm",
                    active ? "nav-capsule" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            })}
            <Button variant="ghost" size="sm" onClick={signOut} className="ml-auto shrink-0 gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </nav>

        <main className="pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile) — floating pill */}
      <nav className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:hidden">
        <div
          className="holo-pane relative flex items-center gap-1 rounded-full px-2 py-2"
        >
          {bottomItems.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            const isCompose = item.to === "/compose";
            if (isCompose) {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  aria-label={item.label}
                  className="mx-1 flex h-12 w-12 items-center justify-center rounded-full text-primary-foreground transition-transform hover:scale-105"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </Link>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-label={item.label}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-full transition-all",
                  active
                    ? "nav-capsule text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {active && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" aria-hidden />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <ChatWidget />
    </div>
    </VoiceCommandProvider>
  );
}