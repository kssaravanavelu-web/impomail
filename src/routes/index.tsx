import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/../public/impo-mail-logo.png.asset.json";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/home", replace: true });
      } else {
        navigate({ to: "/auth", replace: true });
      }
    }, 1400);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(60% 50% at 50% 40%, oklch(0.35 0.14 260 / 0.6), transparent 70%)" }}
      />
      <div
        className={`relative flex flex-col items-center gap-6 transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <img
          src={logoAsset.url}
          alt="ImpoMail"
          className="h-24 w-24 rounded-3xl object-cover shadow-2xl"
          style={{ boxShadow: "var(--shadow-glow)" }}
        />
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Impo<span className="text-primary">Mail</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Only what matters. Nothing else.</p>
        </div>
        <div className="mt-4 flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}