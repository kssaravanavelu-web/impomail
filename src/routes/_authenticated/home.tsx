import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mail, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — ImpoMail" },
      { name: "description", content: "Your ImpoMail home." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Mail className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold">
            Impo<span className="text-primary">Mail</span>
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {name} <span className="inline-block">👋</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          You're signed in. Module 2 (Home dashboard) is coming next.
        </p>
      </main>
    </div>
  );
}