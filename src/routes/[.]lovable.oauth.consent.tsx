import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthClient = { name?: string; redirect_uri?: string } | null | undefined;
type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};

const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

function isSameOriginRelative(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </div>
    </div>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    if (isSameOriginRelative(target)) {
      window.location.assign(target);
    } else {
      window.location.href = target;
    }
  }

  const clientName = details?.client?.name ?? "an app";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border border-border/60 p-6 backdrop-blur-xl"
        style={{ background: "var(--gradient-surface)" }}
      >
        <div className="mb-5 flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: "var(--gradient-primary)" }}
          >
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Connect {clientName} to ImpoMail
            </h1>
            <p className="text-xs text-muted-foreground">
              This lets {clientName} use ImpoMail as you.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{clientName}</span> will be able to call
            ImpoMail's enabled tools while you are signed in.
          </p>
          {scopes.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Requested access</p>
              <ul className="list-inside list-disc text-xs text-muted-foreground">
                {scopes.map((s: string) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            This does not bypass ImpoMail's permissions or backend policies.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            className="h-11 flex-1 font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
            disabled={busy !== null}
            onClick={() => decide(true)}
          >
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
          <Button
            variant="secondary"
            className="h-11 flex-1"
            disabled={busy !== null}
            onClick={() => decide(false)}
          >
            {busy === "deny" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel connection"}
          </Button>
        </div>
      </div>
    </div>
  );
}