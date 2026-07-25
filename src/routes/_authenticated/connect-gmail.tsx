import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { connectAppUser } from "@/integrations/lovable/appUserConnectorClient";
import {
  getGmailStatus,
  saveGmailConnection,
  startGmailConnect,
} from "@/lib/gmail.functions";
import logoAsset from "@/../public/impo-mail-logo.png.asset.json";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";

export const Route = createFileRoute("/_authenticated/connect-gmail")({
  head: () => ({
    meta: [
      { title: "Connect Gmail — ImpoMail" },
      { name: "description", content: "Link your Gmail account to ImpoMail to view and manage messages." },
      { property: "og:title", content: "Connect Gmail — ImpoMail" },
      { property: "og:description", content: "Link your Gmail account securely." },
    ],
  }),
  component: ConnectGmailPage,
});

function ConnectGmailPage() {
  const navigate = useNavigate();
  const start = useServerFn(startGmailConnect);
  const save = useServerFn(saveGmailConnection);
  const status = useServerFn(getGmailStatus);
  const [checking, setChecking] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [autoTried, setAutoTried] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setPopupBlocked(false);
    try {
      const result = await connectAppUser({
        connectorId: "google_mail",
        gatewayBaseUrl: GATEWAY_BASE_URL,
        start: (targetOrigin) => start({ data: targetOrigin }),
      });
      if (!result.success) {
        if (result.error?.toLowerCase().includes("popup")) setPopupBlocked(true);
        toast.error(result.error ?? "Failed to connect Gmail");
        return;
      }
      if (result.connectionAPIKey) {
        await save({ data: { connectionAPIKey: result.connectionAPIKey } });
      }
      setConnected(true);
      toast.success("Gmail connected");
      navigate({ to: "/home", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    status({})
      .then((s) => {
        if (s.connected) {
          setConnected(true);
          navigate({ to: "/home", replace: true });
          return;
        }
        if (!autoTried) {
          setAutoTried(true);
          void handleConnect();
        }
      })
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="glass-card rounded-3xl p-10 max-w-lg w-full text-center silk-rise">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-serif italic text-3xl mb-3">Connect your Gmail</h1>
        <p className="text-muted-foreground mb-8">
          {popupBlocked
            ? "Your browser blocked the sign-in popup. Click below to continue."
            : "Opening Google sign-in… If nothing happens, click the button below."}
        </p>
        <ul className="text-left space-y-3 mb-8">
          <li className="flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground">Secured by Google OAuth — revoke access anytime.</span>
          </li>
          <li className="flex gap-3 items-start">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground">Auto-categorize Business, Jobs, OTPs, Recharges & more.</span>
          </li>
        </ul>
        <Button
          onClick={handleConnect}
          disabled={connecting || checking || connected}
          size="lg"
          className="w-full"
        >
          {connecting || checking ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{checking ? "Checking…" : "Connecting…"}</>
          ) : (
            <>Connect Gmail</>
          )}
        </Button>
        <button
          type="button"
          onClick={() => navigate({ to: "/home", replace: true })}
          className="text-xs text-muted-foreground mt-4 hover:text-foreground transition"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}