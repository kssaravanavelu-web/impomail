import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_PERSONAL_CARD_EMAILS, MAX_GROUP_MEMBERS } from "./cards.constants";
import { TIERS, type TierKey } from "./tier";

export type MailCard = {
  id: string;
  name: string;
  kind: "card" | "group";
  color: string;
  created_at: string;
  is_host: boolean;
  addresses: { id: string; email: string; label: string | null }[];
};

export const listMailCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MailCard[]> => {
    const { data: cards, error } = await context.supabase
      .from("mail_cards")
      .select("id, name, kind, color, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (cards ?? []).map((c) => c.id);
    const { data: addrs } = ids.length
      ? await context.supabase
          .from("mail_card_addresses")
          .select("id, card_id, email, label")
          .in("card_id", ids)
      : { data: [] as { id: string; card_id: string; email: string; label: string | null }[] };
    return (cards ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      kind: (c.kind === "group" ? "group" : "card") as "card" | "group",
      color: c.color,
      created_at: c.created_at,
      is_host: true,
      addresses: (addrs ?? [])
        .filter((a) => a.card_id === c.id)
        .map((a) => ({ id: a.id, email: a.email, label: a.label })),
    }));
  });

export const createMailCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; kind: "card" | "group"; emails: string[] }) => {
    const name = input.name.trim();
    if (!name) throw new Error("Card name is required");
    if (name.length > 60) throw new Error("Card name must be under 60 characters");
    const kind = input.kind === "group" ? ("group" as const) : ("card" as const);
    const emails = input.emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (kind === "card" && emails.length > MAX_PERSONAL_CARD_EMAILS) {
      throw new Error("A personal card can hold only one email address");
    }
    if (emails.length > MAX_GROUP_MEMBERS) throw new Error(`Groups can hold up to ${MAX_GROUP_MEMBERS} members`);
    return { name, kind, emails };
  })
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tier")
      .eq("id", context.userId)
      .maybeSingle();
    const tier = TIERS[(profile?.tier as TierKey) ?? "free"];

    const { data: existing } = await context.supabase
      .from("mail_cards")
      .select("id, kind")
      .eq("user_id", context.userId);
    const currentCards = (existing ?? []).filter((c) => c.kind === "card").length;
    const currentGroups = (existing ?? []).filter((c) => c.kind === "group").length;

    if (data.kind === "card" && currentCards >= tier.limits.maxCards) {
      throw new Error(`Your ${tier.name} plan allows up to ${tier.limits.maxCards} personal cards. Upgrade to create more.`);
    }
    if (data.kind === "group" && currentGroups >= tier.limits.maxGroups) {
      throw new Error(`Your ${tier.name} plan allows up to ${tier.limits.maxGroups} group${tier.limits.maxGroups === 1 ? "" : "s"}. Upgrade to create more.`);
    }

    const { data: card, error } = await context.supabase
      .from("mail_cards")
      .insert({ user_id: context.userId, name: data.name, kind: data.kind })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.emails.length) {
      const { error: aerr } = await context.supabase.from("mail_card_addresses").insert(
        data.emails.map((email) => ({ card_id: card.id, user_id: context.userId, email })),
      );
      if (aerr) throw new Error(aerr.message);
    }
    return { id: card.id };
  });

export const deleteMailCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: card, error: cerr } = await context.supabase
      .from("mail_cards")
      .select("id, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (cerr) throw new Error(cerr.message);
    if (!card) throw new Error("Card not found");
    if (card.user_id !== context.userId) throw new Error("Only the host who created this can delete it");
    const { error } = await context.supabase
      .from("mail_cards")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateMailCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name: string }) => {
    const name = input.name.trim();
    if (!name) throw new Error("Name is required");
    if (name.length > 60) throw new Error("Name must be under 60 characters");
    return { id: input.id, name };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("mail_cards")
      .update({ name: data.name })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const addCardAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string; email: string; label?: string }) => {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address");
    return { cardId: input.cardId, email, label: input.label?.trim().slice(0, 60) || null };
  })
  .handler(async ({ data, context }) => {
    const { data: card, error: cerr } = await context.supabase
      .from("mail_cards")
      .select("id, kind, user_id")
      .eq("id", data.cardId)
      .maybeSingle();
    if (cerr) throw new Error(cerr.message);
    if (!card) throw new Error("Card not found");
    if (card.user_id !== context.userId) throw new Error("Only a host can add members");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tier")
      .eq("id", context.userId)
      .maybeSingle();
    const tier = TIERS[(profile?.tier as TierKey) ?? "free"];
    const { count } = await context.supabase
      .from("mail_card_addresses")
      .select("id", { count: "exact", head: true })
      .eq("card_id", data.cardId);
    const limit = card.kind === "group" ? tier.limits.maxGroupMembers : MAX_PERSONAL_CARD_EMAILS;
    if ((count ?? 0) >= limit) {
      throw new Error(
        card.kind === "group"
          ? `Your ${tier.name} plan allows up to ${limit} group members. Upgrade to add more.`
          : "A personal card can hold only one email address",
      );
    }
    const { error } = await context.supabase.from("mail_card_addresses").insert({
      card_id: data.cardId,
      user_id: context.userId,
      email: data.email,
      label: data.label,
    });
    if (error) throw new Error(error.message.includes("duplicate") ? "That address is already in this card" : error.message);
    return { ok: true as const };
  });

export const removeCardAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("mail_card_addresses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });