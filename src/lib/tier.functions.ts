import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { currentYearMonth, TIERS, type TierKey } from "./tier";

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

    const { data: usage } = await context.supabase
      .from("ai_usage")
      .select("message_count")
      .eq("user_id", context.userId)
      .eq("year_month", currentYearMonth())
      .maybeSingle();

    return {
      tier: tierKey,
      cards: { current: currentCards, limit: tier.limits.maxCards },
      groups: { current: currentGroups, limit: tier.limits.maxGroups },
      aiMessages: { current: usage?.message_count ?? 0, limit: tier.limits.maxAiMessagesPerMonth },
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
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tier")
      .eq("id", context.userId)
      .maybeSingle();
    const tierKey = (profile?.tier as TierKey) ?? "free";
    const tier = TIERS[tierKey];
    const ym = currentYearMonth();

    const { data: usage } = await context.supabase
      .from("ai_usage")
      .select("id, message_count")
      .eq("user_id", context.userId)
      .eq("year_month", ym)
      .maybeSingle();

    const current = usage?.message_count ?? 0;
    if (Number.isFinite(tier.limits.maxAiMessagesPerMonth) && current >= tier.limits.maxAiMessagesPerMonth) {
      throw new Error("You have reached your monthly AI assistant limit. Upgrade to Pro for unlimited messages.");
    }

    if (usage?.id) {
      await context.supabase
        .from("ai_usage")
        .update({ message_count: current + 1 })
        .eq("id", usage.id);
    } else {
      await context.supabase.from("ai_usage").insert({
        user_id: context.userId,
        year_month: ym,
        message_count: 1,
      });
    }
    return { current: current + 1, limit: tier.limits.maxAiMessagesPerMonth };
  });
