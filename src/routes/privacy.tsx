import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ImpoMail" },
      { name: "description", content: "How ImpoMail collects, uses, and protects your Gmail data and account information." },
      { property: "og:title", content: "Privacy Policy — ImpoMail" },
      { property: "og:description", content: "How ImpoMail handles your Gmail data and account information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="July 25, 2026">
      <p>
        This page is maintained by the ImpoMail team (Founder: Saravanavel, Support Founder:
        Vishnuvardhan) to explain how ImpoMail handles your data. It describes the practices of this
        app only, and is not an independent certification or audit.
      </p>

      <Section title="1. Information we collect">
        <ul>
          <li><strong>Account details</strong> — the email address and basic profile info you sign up with, or that Google shares when you use Google sign-in.</li>
          <li><strong>Profile data you enter</strong> — display name, avatar URL and bio you add on your profile page.</li>
          <li><strong>Gmail data</strong> — when you connect Gmail, ImpoMail reads your messages through the Google Gmail API to list, search, categorise and display them, and sends mail you compose in the app.</li>
        </ul>
      </Section>

      <Section title="2. How we use your data">
        <p>
          Your data is used only to operate ImpoMail: authenticating you, showing and categorising your
          mail, powering search and the in-app assistant, and sending messages you explicitly write.
          We do not sell your data or use your email content for advertising.
        </p>
      </Section>

      <Section title="3. Gmail access and Google API scopes">
        <p>
          ImpoMail requests Gmail read, modify, compose and send permissions so it can display your
          inbox and send on your behalf. Access tokens are stored encrypted on our backend and are used
          only when you are using the app. You can revoke access at any time from your Google Account
          permissions page, or by disconnecting Gmail in ImpoMail settings.
        </p>
      </Section>

      <Section title="4. Storage and security">
        <p>
          Account and profile records are stored in our managed cloud database with row-level access
          rules so each user can only read and edit their own data. Connection credentials are stored
          encrypted. Email content is fetched from Google on demand rather than mirrored into a
          long-term archive.
        </p>
      </Section>

      <Section title="5. Third-party services">
        <p>
          We rely on Google (sign-in and Gmail API), our managed cloud backend for authentication and
          database storage, and an AI provider used to power assistant replies and smart search. Text
          you send to the assistant is processed by that provider to generate a response.
        </p>
      </Section>

      <Section title="6. Retention and deletion">
        <p>
          You can edit or clear your profile at any time. If you ask us to delete your account, we
          remove your ImpoMail profile and stored Gmail connection credentials. Mail stored in Gmail
          itself is controlled by Google and is unaffected.
        </p>
      </Section>

      <Section title="7. Your choices">
        <ul>
          <li>Disconnect Gmail at any time to stop all mail access.</li>
          <li>Update or delete your profile information.</li>
          <li>Request account deletion or a copy of your ImpoMail data via the contact below.</li>
        </ul>
      </Section>

      <Section title="8. Contact">
        <p>
          Questions about privacy or security? Reach out to the ImpoMail team through the support
          address listed in the app. We aim to respond to privacy requests promptly.
        </p>
      </Section>

      <p className="text-sm text-muted-foreground">
        See also our <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
      </p>
    </LegalShell>
  );
}

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(50% 35% at 50% 0%, oklch(0.35 0.14 260 / 0.45), transparent 70%)" }}
      />
      <div className="relative mx-auto w-full max-w-3xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-3">
          <BrandLogo className="h-10 w-10 rounded-xl" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Impo<span className="text-primary">Mail</span>
          </span>
        </Link>
        <div
          className="rounded-2xl border border-border/60 p-6 backdrop-blur-xl sm:p-10"
          style={{ background: "var(--gradient-surface)" }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
