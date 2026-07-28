import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { CustomisePanel } from "@/components/customise-panel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type TierKey } from "@/lib/tier";
import { useEffect, useState } from "react";
import { Check, Sparkles, ArrowRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — ImpoMail" },
      { name: "description", content: "Simple plans for a calmer, AI-organized Gmail. Start free, upgrade when you need more cards, groups, or AI messages." },
      { property: "og:title", content: "Pricing — ImpoMail" },
      { property: "og:description", content: "Simple plans for a calmer, AI-organized Gmail. Start free, upgrade when you need more cards, groups, or AI messages." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [session, setSession] = useState<boolean | null>(null);
  const [currentTier, setCurrentTier] = useState<TierKey>("free");
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });
  }, []);

  const tiers = (["free", "pro", "ultra"] as TierKey[]).map((key) => ({
    key,
    ...TIERS[key],
  }));

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(50% 40% at 50% 0%, oklch(0.35 0.14 260 / 0.45), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.09 85 / 0.25), transparent 60%)" }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10 rounded-xl" />
          <span className="font-display text-xl font-semibold tracking-tight">IMPOMAIL</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground sm:gap-6">
          <Link to="/" className="hidden hover:text-foreground sm:inline">Home</Link>
          <Link to="/privacy" className="hidden hover:text-foreground sm:inline">Privacy</Link>
          <Link to="/terms" className="hidden hover:text-foreground sm:inline">Terms</Link>
          <CustomisePanel />
          {session ? (
            <Link to="/home">
              <Button className="gap-2 font-medium text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                Dashboard <Home className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button className="gap-2 font-medium text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                Sign in <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 py-12 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Simple plans for a calmer inbox
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Start free and upgrade when you need more cards, groups, or AI assistant messages.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-center gap-3">
          <span className={cn("text-sm", !yearly && "text-foreground", yearly && "text-muted-foreground")}>Monthly</span>
          <button
            onClick={() => setYearly((v) => !v)}
            className="relative h-6 w-11 rounded-full border border-border/60 bg-card transition"
            aria-label="Toggle yearly billing"
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-primary transition-transform",
                yearly && "translate-x-5",
              )}
            />
          </button>
          <span className={cn("text-sm", yearly && "text-foreground", !yearly && "text-muted-foreground")}>
            Yearly <span className="text-xs text-primary">(2 months free)</span>
          </span>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.key}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card/80 p-6 backdrop-blur-xl transition hover:border-primary/40",
                t.key === "pro" && "border-primary/30 shadow-2xl shadow-primary/10",
              )}
            >
              {t.key === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  Most popular
                </div>
              )}
              <div className="mb-4 flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <h2 className="font-display text-2xl font-semibold">{t.name}</h2>
              </div>
              <p className="mb-5 text-sm text-muted-foreground">{t.description}</p>
              <div className="mb-6">
                <span className="font-display text-4xl font-semibold">
                  {yearly ? yearlyPrice(t.priceCents) : t.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t.key === "free" ? "" : yearly ? "/year" : "/month"}
                </span>
                {yearly && t.key !== "free" && (
                  <p className="mt-1 text-xs text-muted-foreground">Billed once per year</p>
                )}
              </div>
              <ul className="mb-6 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <CurrentPlanButton tier={t.key} current={currentTier} />
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border/60 bg-card/60 p-6 text-center backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">
            Need a larger team plan?{" "}
            <a href="mailto:hello@impomail.app" className="text-primary hover:underline">
              Contact us
            </a>{" "}
            for enterprise pricing.
          </p>
        </div>
      </main>
    </div>
  );
}

function yearlyPrice(cents: number): string {
  if (cents === 0) return "$0";
  const yearly = Math.round(cents * 10);
  return `$${(yearly / 100).toFixed(0)}`;
}

function CurrentPlanButton({ tier, current }: { tier: TierKey; current: TierKey }) {
  const isCurrent = tier === current;
  if (isCurrent) {
    return (
      <Button disabled className="w-full bg-primary/20 text-primary hover:bg-primary/20">
        Current plan
      </Button>
    );
  }
  return (
    <Link to="/auth" className="block w-full">
      <Button className="w-full gap-2 font-medium text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
        {tier === "free" ? "Downgrade" : "Upgrade"} <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );
}
