import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalShell, Section } from "./privacy";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ImpoMail" },
      { name: "description", content: "The rules and conditions for using ImpoMail, the smart Gmail companion." },
      { property: "og:title", content: "Terms of Service — ImpoMail" },
      { property: "og:description", content: "The rules and conditions for using ImpoMail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="July 25, 2026">
      <p>
        By creating an ImpoMail account or signing in, you agree to these terms. If you do not agree,
        please do not use the service.
      </p>

      <Section title="1. The service">
        <p>
          ImpoMail is a companion interface for your Gmail account. It helps you read, search,
          categorise, compose and send mail, and offers an in-app assistant. ImpoMail is not affiliated
          with or endorsed by Google.
        </p>
      </Section>

      <Section title="2. Your account">
        <p>
          You must provide accurate information and are responsible for activity under your account and
          for keeping your credentials secure. You must be legally able to enter into this agreement and
          may only connect Gmail accounts you are authorised to use.
        </p>
      </Section>

      <Section title="3. Acceptable use">
        <ul>
          <li>No spam, bulk unsolicited mail, phishing or impersonation.</li>
          <li>No unlawful, harassing, or infringing content.</li>
          <li>No attempts to break, overload, reverse-engineer, or gain unauthorised access to the service.</li>
          <li>No use of the assistant or automation to violate Google's terms or any applicable law.</li>
        </ul>
      </Section>

      <Section title="4. Your content">
        <p>
          You keep all rights to your email content. You grant ImpoMail only the permission needed to
          display, organise and send that content on your instruction while you use the app.
        </p>
      </Section>

      <Section title="5. AI assistant">
        <p>
          Assistant replies and smart-search suggestions are generated automatically and may be
          inaccurate. Review anything important before acting on it or sending it.
        </p>
      </Section>

      <Section title="6. Availability and changes">
        <p>
          The service is provided on an "as is" and "as available" basis. Features may change and access
          may be interrupted. We may update these terms; continued use after an update means you accept
          the new version.
        </p>
      </Section>

      <Section title="7. Termination">
        <p>
          You may stop using ImpoMail and disconnect Gmail at any time. We may suspend or terminate
          accounts that breach these terms or that put the service or other users at risk.
        </p>
      </Section>

      <Section title="8. Liability">
        <p>
          To the fullest extent permitted by law, ImpoMail and its team are not liable for indirect or
          consequential losses, lost data, or lost profits arising from use of the service.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>Questions about these terms can be sent to the ImpoMail support address listed in the app.</p>
      </Section>

      <p className="text-sm text-muted-foreground">
        See also our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
      </p>
    </LegalShell>
  );
}
