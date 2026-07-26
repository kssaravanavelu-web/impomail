import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MailCard = {
  id: string;
  name: string;
  kind: "card" | "group";
  color: string;
  created_at: string;
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
    return {
      name,
      kind: input.kind === "group" ? ("group" as const) : ("card" as const),
      emails: input.emails.map((e) => e.trim().toLowerCase()).filter(Boolean).slice(0, 100),
    };
  })
  .handler(async ({ data, context }) => {
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
    const { error } = await context.supabase.from("mail_cards").delete().eq("id", data.id);
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