import { currentYearMonth, TIERS, type TierKey } from "./tier";

export type SupabaseContext = {
  supabase: {
    from: (table: string) => any;
  };
  userId: string;
};

export async function getUserTier(context: SupabaseContext): Promise<TierKey> {
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("tier")
    .eq("id", context.userId)
    .maybeSingle();
  return (profile?.tier as TierKey) ?? "free";
}

export async function incrementAiMessageCount(context: SupabaseContext): Promise<{ current: number; limit: number }> {
  const tierKey = await getUserTier(context);
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

  const next = current + 1;
  if (usage?.id) {
    await context.supabase
      .from("ai_usage")
      .update({ message_count: next })
      .eq("id", usage.id);
  } else {
    await context.supabase.from("ai_usage").insert({
      user_id: context.userId,
      year_month: ym,
      message_count: next,
    });
  }
  return { current: next, limit: tier.limits.maxAiMessagesPerMonth };
}

export async function checkAiLimit(context: SupabaseContext): Promise<void> {
  const tierKey = await getUserTier(context);
  const tier = TIERS[tierKey];
  const ym = currentYearMonth();
  const { data: usage } = await context.supabase
    .from("ai_usage")
    .select("message_count")
    .eq("user_id", context.userId)
    .eq("year_month", ym)
    .maybeSingle();
  const current = usage?.message_count ?? 0;
  if (Number.isFinite(tier.limits.maxAiMessagesPerMonth) && current >= tier.limits.maxAiMessagesPerMonth) {
    throw new Error("You have reached your monthly AI assistant limit. Upgrade to Pro for unlimited messages.");
  }
}
