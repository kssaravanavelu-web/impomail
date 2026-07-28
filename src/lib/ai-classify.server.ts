import type { Category } from "@/lib/mock-data";

const CATEGORIES: Category[] = ["payment", "otp", "jobs", "recharges", "personal", "promotions", "updates", "travel"];

export type AmbiguousMail = { id: string; from: string; subject: string; snippet: string };

/**
 * L3 of the pipeline: semantic classification for mail that rules and regex
 * could not place. Batched into a single model call and best-effort — on any
 * failure the caller keeps its fallback category.
 */
export async function classifyWithAI(items: AmbiguousMail[]): Promise<Record<string, Category>> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key || items.length === 0) return {};
  const list = items
    .slice(0, 20)
    .map((m) => `id=${m.id}\nfrom: ${m.from}\nsubject: ${m.subject}\npreview: ${(m.snippet ?? "").slice(0, 200)}`)
    .join("\n---\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              `You classify emails into exactly one of: ${CATEGORIES.join(", ")}.\n` +
              `payment = invoices, bank alerts, statements, due-date reminders.\n` +
              `otp = one-time codes, login alerts, password resets.\n` +
              `jobs = applications, interview invites, offer letters, internships.\n` +
              `recharges = mobile/DTH recharges, SaaS renewals, membership billing.\n` +
              `personal = 1:1 human correspondence, not bulk-sent.\n` +
              `promotions = marketing, deals, newsletters.\n` +
              `updates = shipping/delivery, account notices, service status.\n` +
              `travel = flight/train/hotel confirmations and itineraries.\n` +
              `Reply with JSON only: {"results":[{"id":"...","category":"..."}]}`,
          },
          { role: "user", content: list },
        ],
      }),
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    const parsed = JSON.parse(match[0]) as { results?: { id: string; category: string }[] };
    const out: Record<string, Category> = {};
    for (const r of parsed.results ?? []) {
      if (CATEGORIES.includes(r.category as Category)) out[r.id] = r.category as Category;
    }
    return out;
  } catch {
    return {};
  }
}
