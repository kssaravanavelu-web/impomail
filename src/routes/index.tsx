import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { CustomisePanel } from "@/components/customise-panel";
import { Button } from "@/components/ui/button";
import {
  Inbox, Sparkles, Shield, Mail, ArrowRight, Check, Search,
  Lock, Tags, Star, KeyRound, Globe, Send, FileEdit, Archive,
} from "lucide-react";


const TITLE = "IMPOMAIL | Smart Gmail Management & Organisation";
const DESC =
  "IMPOMAIL helps users organise Gmail, manage emails efficiently, categorise conversations, search quickly, and securely connect with Google using OAuth.";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "IMPOMAIL" },
      { property: "og:url", content: "https://impomail.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://impomail.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "IMPOMAIL",
          url: "https://impomail.lovable.app/",
          description: DESC,
          applicationCategory: "EmailApplication",
          operatingSystem: "Web",
          author: { "@type": "Organization", name: "IMPOMAIL", email: "support@impomail.com" },
        }),
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  { emoji: "📧", icon: Inbox, title: "Smart Email Management", desc: "Organise Gmail efficiently." },
  { emoji: "🔍", icon: Search, title: "Powerful Search", desc: "Find important emails instantly." },
  { emoji: "🏷", icon: Tags, title: "Smart Categories", desc: "Sort emails into useful categories." },
  { emoji: "⭐", icon: Star, title: "Important Mail Detection", desc: "Highlight important conversations." },
  { emoji: "🎙", icon: Sparkles, title: "Voice Assistant", desc: "Control the app and chat hands-free with Impo." },
  { emoji: "🔒", icon: Shield, title: "Secure Google Sign-In", desc: "Uses Google's secure OAuth authentication." },
];


const PERMISSIONS = [
  { icon: Inbox, text: "Read emails for organisation and categorisation" },
  { icon: Send, text: "Send emails on behalf of the user when requested" },
  { icon: FileEdit, text: "Create and save draft emails" },
  { icon: Archive, text: "Modify labels and archive emails" },
  { icon: Search, text: "Search and retrieve relevant email threads" },
];


const PRIVACY_POINTS = [
  { icon: Lock, title: "User data belongs to the user", desc: "You own your Gmail content. IMPOMAIL only processes it to deliver the features you use." },
  { icon: Shield, title: "OAuth authentication is provided by Google", desc: "IMPOMAIL never sees or stores your Google password." },
  { icon: Globe, title: "Data is transmitted securely using HTTPS", desc: "All traffic between your browser, IMPOMAIL and Google APIs is encrypted in transit." },
  { icon: KeyRound, title: "Disconnect at any time", desc: "You can revoke IMPOMAIL's access to your Google account whenever you choose." },
  { icon: Check, title: "Google API Services User Data Policy", desc: "IMPOMAIL follows Google's API Services User Data Policy, including the Limited Use requirements." },
];

function LandingPage() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        supabase.auth.getSession().then(({ data: d }) => setSession(!!d.session));
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const connectHref = session === true ? "/connect-gmail" : "/auth";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(60% 45% at 50% 0%, oklch(0.55 0.16 255 / 0.35), transparent 72%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.62 0.15 250 / 0.35), transparent 60%)" }}
      />

      {/* Navbar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10 rounded-xl" />
          <span className="lux-wordmark font-display text-xl font-semibold tracking-tight">IMPOMAIL</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground sm:gap-6">
          <a href="#about" className="hidden hover:text-foreground sm:inline">About</a>
          <a href="#permissions" className="hidden hover:text-foreground md:inline">Permissions</a>
          <Link to="/privacy" className="hidden hover:text-foreground sm:inline">Privacy</Link>
          <CustomisePanel />
          <Link to={session === true ? "/home" : "/auth"}>
            <Button className="gap-2 font-medium text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              {session === true ? "Dashboard" : "Sign in"} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-10 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="silk-rise max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Gmail integration · Google OAuth
              </div>
              <h1 className="font-display text-4xl font-light leading-[1.08] tracking-tight lg:text-6xl">
                Manage Your Gmail Smarter with{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                  IMPOMAIL
                </span>
              </h1>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground lg:text-lg">
                IMPOMAIL is an intelligent email management platform that securely connects to your Google account
                (with your permission) to help organise your Gmail, categorise messages, search quickly,
                and control your inbox using a built-in voice assistant.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={connectHref}>
                  <Button
                    size="lg"
                    className="h-12 w-full gap-2 px-7 text-base font-semibold text-primary-foreground sm:w-auto"
                    style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
                  >
                    <Mail className="h-4 w-4" /> Connect Gmail
                  </Button>
                </Link>
                <a href="#about">
                  <Button size="lg" variant="outline" className="h-12 w-full gap-2 border-border/60 px-7 text-base hover:border-primary/40 sm:w-auto">
                    Learn More <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Explicit user consent required</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Encrypted HTTPS transport</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> No data selling</span>
              </div>
            </div>

            <div className="silk-rise rise-2">
              <div className="glass-card gold-hairline relative overflow-hidden rounded-3xl p-6 lg:p-8" style={{ background: "var(--gradient-surface)" }}>
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">Preview</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Live categories</span>
                </div>
                <div className="space-y-3">
                  <PreviewRow icon={Inbox} label="Unread mail" value="12" />
                  <PreviewRow icon={CreditCard} label="Payments and Bills" value="3" />
                  <PreviewRow icon={Shield} label="OTP and Security" value="2" />
                  <PreviewRow icon={Mail} label="Jobs and Internships" value="5" />
                </div>
                <div className="mt-6 rounded-2xl border border-border/60 bg-background/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Use voice commands or the chat assistant to manage your inbox hands-free.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* What is IMPOMAIL */}
        <section id="about" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 lg:px-10 lg:pb-24">
          <div className="glass-card rounded-3xl border border-border/60 p-8 lg:p-12" style={{ background: "var(--gradient-surface)" }}>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl tracking-tight lg:text-4xl">What is IMPOMAIL?</h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground lg:text-lg">
                IMPOMAIL is a productivity platform built to simplify Gmail management. It securely connects to
                your Google account (with your permission) to help organise emails, categorise messages, search
                efficiently, and manage your inbox with a smart voice assistant. IMPOMAIL never accesses your
                Gmail without your explicit authorisation.
              </p>

            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 lg:px-10 lg:pb-24">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">Features</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight lg:text-4xl">Everything IMPOMAIL does for your inbox</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* Why permissions */}
        <section id="permissions" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 lg:px-10 lg:pb-24">
          <div className="glass-card rounded-3xl border border-border/60 p-8 lg:p-12" style={{ background: "var(--gradient-surface)" }}>
            <h2 className="font-display text-3xl tracking-tight lg:text-4xl">Why does IMPOMAIL request Gmail access?</h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              IMPOMAIL requests Gmail permissions only after the user grants consent. These permissions allow the
              application to:
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {PERMISSIONS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/30 p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" strokeWidth={1.6} />
                  </div>
                  <span className="text-sm leading-relaxed text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm font-medium text-foreground">
              IMPOMAIL does not sell user data or share personal Gmail content with third parties.
            </p>
          </div>
        </section>

        {/* Privacy & security */}
        <section id="privacy" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 lg:px-10 lg:pb-24">
          <div className="mb-10 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">Privacy &amp; Security</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight lg:text-4xl">Your data, under your control</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PRIVACY_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card gold-hairline rounded-2xl p-5 transition hover:border-primary/30">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-lg font-medium tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 lg:px-10 lg:pb-24">
          <div className="glass-card flex flex-col items-center gap-4 rounded-3xl border border-border/60 p-8 text-center lg:p-12" style={{ background: "var(--gradient-surface)" }}>
            <h2 className="font-display text-3xl tracking-tight lg:text-4xl">Contact Us</h2>
            <p className="text-sm text-muted-foreground">
              Website name: <strong className="text-foreground">IMPOMAIL</strong>
            </p>
            <a href="mailto:support@impomail.com" className="text-base font-medium text-primary hover:underline">
              support@impomail.com
            </a>
            <Link to={connectHref} className="mt-2">
              <Button size="lg" className="h-12 gap-2 px-7 text-base font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                <Mail className="h-4 w-4" /> Connect Gmail
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60 bg-card/30 px-5 py-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} IMPOMAIL. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <a href="mailto:support@impomail.com" className="hover:text-foreground">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PreviewRow({ icon: Icon, label, value }: { icon: typeof Inbox; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="font-display text-2xl font-light tracking-tight">{value}</span>
    </div>
  );
}

function FeatureCard({ emoji, icon: Icon, title, desc }: { emoji: string; icon: typeof Inbox; title: string; desc: string }) {
  return (
    <div className="glass-card gold-hairline rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/30">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <span aria-hidden className="text-lg">{emoji}</span>
      </div>
      <h3 className="font-display text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}
