import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { CONSENT_VERSION, clearPendingConsent, readPendingConsent } from "@/lib/consent";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Hard gate: no app access without accepting the Terms of Service + Privacy Policy.
    const accepted = (data.user.user_metadata as Record<string, unknown> | null)?.terms_accepted_version;
    if (accepted !== CONSENT_VERSION) {
      if (readPendingConsent() === CONSENT_VERSION) {
        await supabase.auth.updateUser({
          data: { terms_accepted_version: CONSENT_VERSION, terms_accepted_at: new Date().toISOString() },
        });
        clearPendingConsent();
      } else {
        throw redirect({ to: "/auth", search: { next: "" } });
      }
    }
    return { user: data.user };
  },
  component: AppLayout,
});