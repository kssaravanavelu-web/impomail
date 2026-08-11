import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow, format } from "date-fns";
import {
  Mail,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Check,
  X,
  RefreshCw,
  ArrowLeft,
  Home,
  Unlink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/message-list";
import { getGmailConnectionDetails, disconnectGmail, GOOGLE_SCOPES } from "@/lib/gmail.functions";

const SCOPE_LABELS: Record<string, string> = {
  "https://www.googleapis.com/auth/userinfo.email": "Read your email address",
  "https://www.googleapis.com/auth/userinfo.profile": "Read your public profile",
  "https://www.googleapis.com/auth/gmail.readonly": "Read your Gmail messages",
  "https://www.googleapis.com/auth/gmail.modify": "Modify labels & mark messages read/unread",
  "https://www.googleapis.com/auth/gmail.send": "Send emails from your account",
  "https://www.googleapis.com/auth/gmail.compose": "Create and manage drafts",
};

export const Route = createFileRoute("/_authenticated/gmail-status")({
  head: () => ({
    meta: [
      { title: "Gmail Connection — ImpoMail" },
      { name: "description", content: "Check your Gmail connection status, scopes and last sync." },
      { property: "og:title", content: "Gmail Connection — ImpoMail" },
      { property: "og:description", content: "Check your Gmail connection status, scopes and last sync." },
    ],
  }),
  component: GmailStatusPage,
});

function GmailStatusPage() {
  const navigate = useNavigate();
  const fetchDetails = useServerFn(getGmailConnectionDetails);
  const doDisconnect = useServerFn(disconnectGmail);

  const {
    data: status,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["gmail-connection-status"],
    queryFn: () => fetchDetails({}),
    refetchOnWindowFocus: true,
  });

  const handleDisconnect = async () => {
    try {
      await doDisconnect({});
      toast.success("Gmail disconnected");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disconnect");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="mb-4 flex items-center justify-between">
        <PageHeader title="Gmail Connection" />
        <div className="flex items-center gap-2">
          <Link
            to="/home"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40"
          >
            <Home className="h-3.5 w-3.5" /> Home
          </Link>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Settings
          </Link>
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Mail className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-lg font-semibold">Gmail</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Checking status…" : status?.connected ? status.email ?? "Connected account" : "Not connected"}
            </p>
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : status?.connected ? (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              <X className="h-3.5 w-3.5" /> Disconnected
            </span>
          )}
        </div>

        <div className="divide-y divide-border/60">
          {/* Verification status */}
          <div className="px-5 py-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <VerificationIcon status={status?.verification?.status ?? "disconnected"} />
              Verification status
            </div>
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                "Checking connection with Google…"
              ) : error ? (
                "Unable to check status right now."
              ) : status?.verification?.status === "verified" ? (
                "ImpoMail can successfully reach your Gmail account."
              ) : status?.verification?.status === "expired" ? (
                <span className="text-amber-400">
                  {status.verification.error ?? "Your Google sign-in expired. Reconnect Gmail to keep syncing."}
                </span>
              ) : status?.verification?.status === "failed" ? (
                <span className="text-destructive">{status.verification.error ?? "Connection test failed."}</span>
              ) : (
                "Connect Gmail to verify the integration."
              )}
            </p>
            {status?.verification?.status === "expired" && (
              <Button
                className="mt-3 gap-2"
                style={{ background: "var(--gradient-primary)" }}
                onClick={() => navigate({ to: "/connect-gmail" })}
              >
                <RefreshCw className="h-4 w-4" /> Reconnect Gmail
              </Button>
            )}
          </div>

          {/* Sync time */}
          <div className="px-5 py-4">
            <div className="mb-2 text-sm font-medium">Last sync</div>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading…"
                : status?.lastSyncAt
                ? `${formatDistanceToNow(new Date(status.lastSyncAt))} ago · ${format(new Date(status.lastSyncAt), "PPp")}`
                : "Never synced"}
            </p>
            {status?.createdAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Connected {formatDistanceToNow(new Date(status.createdAt))} ago
              </p>
            )}
          </div>

          {/* Scopes */}
          <div className="px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium">Authorized scopes</div>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            <ul className="space-y-2">
              {(status?.scopes ?? GOOGLE_SCOPES).map((scope) => (
                <li
                  key={scope}
                  className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5"
                >
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{SCOPE_LABELS[scope] ?? scope}</div>
                    <div className="text-[11px] text-muted-foreground">{scope.replace("https://www.googleapis.com/auth/", "")}</div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Scopes are granted during the Google consent screen. If a feature is missing, reconnect Gmail and accept all permissions.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-border/60 px-5 py-4 sm:flex-row">
          {status?.connected ? (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate({ to: "/connect-gmail" })}
              >
                <RefreshCw className="h-4 w-4" /> Reconnect
              </Button>
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={handleDisconnect}>
                <Unlink className="h-4 w-4" /> Disconnect Gmail
              </Button>
            </>
          ) : (
            <Button
              onClick={() => navigate({ to: "/connect-gmail" })}
              className="gap-2"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Mail className="h-4 w-4" /> Connect Gmail
            </Button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Your connection key is encrypted and stored server-side. ImpoMail never sees your Google password.
      </p>
    </div>
  );
}

function VerificationIcon({ status }: { status: "verified" | "failed" | "expired" | "disconnected" }) {
  if (status === "verified") return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
  if (status === "expired") return <ShieldAlert className="h-4 w-4 text-amber-400" />;
  if (status === "failed") return <ShieldAlert className="h-4 w-4 text-destructive" />;
  return <Shield className="h-4 w-4 text-muted-foreground" />;
}
