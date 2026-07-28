import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TIERS, type TierKey } from "./tier";
import { checkAiLimit, getAiUsage, incrementAiMessageCount } from "./tier.server";

export type UsageSummary = {
  tier: TierKey;
  cards: { current: number; limit: number };
  groups: { current: number; limit: number };
  aiMessages: { current: number; limit: number };
};

export const getCurrentUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageSummary> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tier")
      .eq("id", context.userId)
      .maybeSingle();
    const tierKey = (profile?.tier as TierKey) ?? "free";
    const tier = TIERS[tierKey];

    const { data: cards } = await context.supabase
      .from("mail_cards")
      .select("id, kind")
      .eq("user_id", context.userId);
    const currentCards = (cards ?? []).filter((c) => c.kind === "card").length;
    const currentGroups = (cards ?? []).filter((c) => c.kind === "group").length;

    const { current, limit } = await getAiUsage({ supabase: context.supabase, userId: context.userId });

    return {
      tier: tierKey,
      cards: { current: currentCards, limit: tier.limits.maxCards },
      groups: { current: currentGroups, limit: tier.limits.maxGroups },
      aiMessages: { current, limit },
    };
  });

export const checkCanCreateCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "card" | "group" }) => input)
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tier")
      .eq("id", context.userId)
      .maybeSingle();
    const tierKey = (profile?.tier as TierKey) ?? "free";
    const tier = TIERS[tierKey];

    const { data: cards } = await context.supabase
      .from("mail_cards")
      .select("id, kind")
      .eq("user_id", context.userId);
    const currentCards = (cards ?? []).filter((c) => c.kind === "card").length;
    const currentGroups = (cards ?? []).filter((c) => c.kind === "group").length;

    if (data.kind === "card") {
      if (currentCards >= tier.limits.maxCards) {
        throw new Error(`Free tier allows up to ${tier.limits.maxCards} personal cards. Upgrade to create more.`);
      }
    } else {
      if (currentGroups >= tier.limits.maxGroups) {
        throw new Error(`Free tier allows up to ${tier.limits.maxGroups} group. Upgrade to create more.`);
      }
    }
    return { ok: true as const };
  });

export const incrementAiUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await checkAiLimit({ supabase: context.supabase, userId: context.userId });
    return incrementAiMessageCount({ supabase: context.supabase, userId: context.userId });
  });
