import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Inbox, Sparkles, Shield, Zap, Mail, ArrowRight, Check, Search, Lock, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IMPOMAIL — Smart Gmail Companion" },
      { name: "description", content: "IMPOMAIL is a Gmail companion app that organizes your emails into smart categories — payments, jobs, OTPs, bills, and more — with an AI assistant and voice controls." },
      { property: "og:title", content: "IMPOMAIL — Smart Gmail Companion" },
      { property: "og:description", content: "IMPOMAIL organizes your Gmail into smart categories — payments, jobs, OTPs, bills, and more — with an AI assistant and voice controls." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://impomail.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://impomail.lovable.app/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "IMPOMAIL",
          url: "https://impomail.lovable.app/",
          description: "IMPOMAIL is a Gmail companion app that organizes your emails into smart categories — payments, jobs, OTPs, bills, and more — with an AI assistant and voice controls.",
          applicationCategory: "EmailApplication",
          operatingSystem: "Web",
          author: {
            "@type": "Organization",
            name: "IMPOMAIL",
          },
        }),
      },
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
            IMPOMAIL
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
                IMPOMAIL: only the mail that <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>matters</span>
              </h1>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground lg:text-lg">
                <strong className="text-foreground">IMPOMAIL is a smart Gmail companion app.</strong> It connects to your Gmail account, reads your messages, and automatically sorts them into the categories that matter most — payments, jobs, internships, OTPs, recharges, personal, promotions, and updates — so you can focus on what is important without digging through a noisy inbox.
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
              desc="Ask Impo to search, read, compose, or navigate the app — hands-free."
            />
            <FeatureCard
              icon={Shield}
              title="Private by design"
              desc="Your mail stays in Gmail. Tokens are encrypted and we never sell your data."
            />
          </div>
        </section>

        {/* What is IMPOMAIL? */}
        <section className="mx-auto max-w-6xl px-5 pb-20 lg:px-10 lg:pb-28">
          <div className="rounded-3xl border border-border/60 p-8 lg:p-12" style={{ background: "var(--gradient-surface)" }}>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">What is IMPOMAIL?</p>
              <h2 className="mt-3 font-display text-3xl tracking-tight lg:text-4xl">
                A Gmail companion built for clarity
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground lg:text-lg">
                IMPOMAIL is a web application that helps Gmail users organize their inbox by automatically categorizing messages into meaningful sections: <strong className="text-foreground">payments, jobs, internships, OTPs, recharges, personal conversations, promotions, and updates.</strong> It also includes an AI assistant named Impo who can read, search, summarize, and compose messages on your behalf using voice or text commands.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                The app is built for professionals, students, and anyone who receives a high volume of transactional email and wants to find what matters in seconds.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 pb-20 lg:px-10 lg:pb-28">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">How it works</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight lg:text-4xl">Three steps to a calm inbox</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <StepCard
              step="1"
              icon={Mail}
              title="Sign in with Gmail"
              desc="Create an ImpoMail account and securely connect your Gmail inbox with encrypted OAuth tokens."
            />
            <StepCard
              step="2"
              icon={Search}
              title="Auto-organize"
              desc="ImpoMail reads your messages and places them into smart categories so you can browse by purpose."
            />
            <StepCard
              step="3"
              icon={MessageCircle}
              title="Ask Impo"
              desc="Use voice or text to search, read, compose, and manage your mail across any language."
            />
          </div>
        </section>

        {/* Trust & contact */}
        <section className="mx-auto max-w-6xl px-5 pb-20 lg:px-10 lg:pb-28">
          <div className="grid items-center gap-8 rounded-3xl border border-border/60 p-8 lg:grid-cols-2 lg:p-12" style={{ background: "var(--gradient-surface)" }}>
            <div>
              <h2 className="font-display text-2xl tracking-tight lg:text-3xl">Built with privacy in mind</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Your Gmail messages are processed through official Google APIs with encrypted tokens. We do not sell your data, serve ads, or train third-party models on your mail. You can disconnect your Gmail account at any time from the Settings page.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/30 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">AES-256 encrypted tokens</p>
                  <p className="text-xs text-muted-foreground">OAuth credentials are encrypted at rest.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/30 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">No ads or data selling</p>
                  <p className="text-xs text-muted-foreground">Your mail is never sold to advertisers.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60 bg-card/30 px-5 py-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            IMPOMAIL · Founder: Saravanavel · Support Founder: Vishnuvardhan
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <a href="mailto:support@impomail.lovable.app" className="hover:text-foreground">Contact support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ step, icon: Icon, title, desc }: { step: string; icon: typeof Inbox; title: string; desc: string }) {
  return (
    <div className="glass-card gold-hairline rounded-2xl p-6 transition hover:border-primary/30">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary font-display text-lg">
        {step}
      </div>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
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
