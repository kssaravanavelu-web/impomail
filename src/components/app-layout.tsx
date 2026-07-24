import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Mail, Inbox, Send, FileText, Trash2, Archive, Settings, Search, PenSquare, Sparkles, LogOut, Menu, Home } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarItem = {
  to: "/compose" | "/home" | "/inbox" | "/sent" | "/drafts" | "/trash" | "/archive";
  label: string;
  icon: typeof Inbox;
  accent?: boolean;
};
const sidebarItems: SidebarItem[] = [
  { to: "/compose", label: "Compose", icon: PenSquare, accent: true },
  { to: "/home", label: "Home", icon: Home },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/sent", label: "Sent", icon: Send },
  { to: "/drafts", label: "Drafts", icon: FileText },
  { to: "/trash", label: "Trash", icon: Trash2 },
  { to: "/archive", label: "Archive", icon: Archive },
];

const bottomItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/compose", label: "Compose", icon: PenSquare },
  { to: "/ai-search", label: "AI", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border/60 bg-card/50 backdrop-blur transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Mail className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Impo<span className="text-primary">Mail</span>
          </span>
        </div>
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
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors",
                  active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
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
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center gap-2 lg:justify-start">
            <Link
              to="/search"
              className="flex w-full max-w-md items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/50"
            >
              <Search className="h-4 w-4" /> Search mail…
            </Link>
          </div>
          <Link
            to="/ai-search"
            className="ml-2 hidden items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary sm:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Search
          </Link>
        </header>

        <main className="pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {bottomItems.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            const isCompose = item.to === "/compose";
            if (isCompose) {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-lg"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}