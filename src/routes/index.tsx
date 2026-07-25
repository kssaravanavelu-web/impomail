import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Inbox, Sparkles, Shield, Zap, Mail, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ImpoMail — Only what matters" },
      { name: "description", content: "ImpoMail is a smart Gmail companion that sorts your important mail into clear categories — OTPs, jobs, bills, payments, and more — so you only see what matters." },
      { property: "og:title", content: "ImpoMail — Only what matters" },
      { property: "og:description", content: "ImpoMail is a smart Gmail companion that sorts your important mail into clear categories — OTPs, jobs, bills, payments, and more." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://impomail.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://impomail.lovable.app/" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        supabase.auth.getSession().then(({ data: d }) => setSession(!!d.session));
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Ambient background glows */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(50% 40% at 50% 0%, oklch(0.35 0.14 260 / 0.45), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.09 85 / 0.25), transparent 60%)" }}
      />

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10 rounded-xl" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Impo<span className="text-primary">Mail</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          {session === true ? (
            <Link to="/home">
              <Button className="gap-2 font-medium text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                Dashboard <ArrowRight className="h-4 w-4" />
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

      {/* Hero */}
      <main className="relative z-10 flex-1">
        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-10 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="silk-rise max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Smart Gmail companion
              </div>
              <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight lg:text-7xl">
                Only the mail that <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>matters</span>
              </h1>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground lg:text-lg">
                ImpoMail connects to your Gmail and instantly sorts your messages into the categories that matter most: <strong className="text-foreground">payments, jobs, internships, OTPs, recharges, personal, promotions, and updates</strong>. No more digging through noisy inboxes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {session === true ? (
                  <Link to="/home">
                    <Button size="lg" className="h-12 gap-2 px-7 text-base font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                      Go to dashboard <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth">
                    <Button size="lg" className="h-12 gap-2 px-7 text-base font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                      Get started free <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="h-12 gap-2 px-7 text-base border-border/60 hover:border-primary/40">
                    <Mail className="h-4 w-4" /> Sign in with Gmail
                  </Button>
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Gmail native</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> AES-256 encrypted tokens</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> No ads or data selling</span>
              </div>
            </div>

            {/* Feature preview card */}
            <div className="silk-rise rise-2">
              <div
                className="glass-card gold-hairline relative overflow-hidden rounded-3xl p-6 lg:p-8"
                style={{ background: "var(--gradient-surface)" }}
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">Preview</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Live categories</span>
                </div>
                <div className="space-y-3">
                  <PreviewRow icon={Inbox} label="Unread mail" value="12" color="text-primary" />
                  <PreviewRow icon={Zap} label="Payments & Bills" value="3" color="text-amber-400" />
                  <PreviewRow icon={Shield} label="OTP & Security" value="2" color="text-emerald-400" />
                  <PreviewRow icon={Mail} label="Jobs & Internships" value="5" color="text-sky-400" />
                </div>
                <div className="mt-6 rounded-2xl border border-border/60 bg-background/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="text-sm text-muted-foreground">AI assistant organizes and answers your mail in any language.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 pb-20 lg:px-10 lg:pb-28">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">Why ImpoMail</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight lg:text-4xl">Your inbox, finally organized</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Inbox}
              title="Auto-categorize"
              desc="Gmail messages are sorted into Payments, Jobs, OTPs, Recharges, Personal, Promotions, and Updates."
            />
            <FeatureCard
              icon={Zap}
              title="Instant OTP vault"
              desc="Extract and surface one-time passwords the moment they hit your inbox."
            />
            <FeatureCard
              icon={Sparkles}
              title="Voice + AI assistant"
              desc="Ask "Impo" to search, read, compose, or navigate the app — hands-free."
            />
            <FeatureCard
              icon={Shield}
              title="Private by design"
              desc="Your mail stays in Gmail. Tokens are encrypted and we never sell your data."
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60 bg-card/30 px-5 py-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            ImpoMail · Founder: Saravanavel · Support Founder: Vishnuvardhan
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PreviewRow({ icon: Icon, label, value, color }: { icon: typeof Inbox; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="font-display text-2xl font-light tracking-tight">{value}</span>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: typeof Inbox; title: string; desc: string }) {
  return (
    <div className="glass-card gold-hairline rounded-2xl p-5 transition hover:border-primary/30">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
