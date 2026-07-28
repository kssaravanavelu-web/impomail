import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Category } from "@/lib/mock-data";

const CATEGORIES = ["payment", "otp", "jobs", "recharges", "personal", "promotions", "updates", "travel"] as const;

export type SenderRuleRow = { id: string; pattern: string; category: Category };

export const listSenderRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SenderRuleRow[]> => {
    const { data, error } = await context.supabase
      .from("sender_rules")
      .select("id, pattern, category")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((r) => ({ id: r.id, pattern: r.pattern, category: r.category as Category }));
  });

/** A manual re-file becomes a permanent rule for that sender. */
export const setSenderRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ pattern: z.string().min(3), category: z.enum(CATEGORIES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sender_rules").upsert(
      { user_id: context.userId, pattern: data.pattern.trim().toLowerCase(), category: data.category },
      { onConflict: "user_id,pattern" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSenderRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sender_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
