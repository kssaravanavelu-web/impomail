import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const SYSTEM_PROMPT = `You are Impo, the in-app assistant for ImpoMail — a luxury Gmail client with an "Obsidian Glass" aesthetic (deep black surfaces, champagne-gold accents, Cormorant Garamond serif headings).

About ImpoMail (know this cold):
- ImpoMail connects a user's real Gmail account and shows their inbox inside a bespoke UI. It is not a mock — messages, sending, and folders all flow through the Gmail API.
- Core pages the user can visit: Home (dashboard grouped by sector/category), Inbox, Sent, Drafts, Trash, Archive, Compose (supports attachments up to 20 MB total), Search, AI Search, Category pages (OTP, Jobs, Social, Promotions, Updates, Personal, Finance, Travel), Profile (edit name, avatar URL, bio), Settings (Gmail connect + connection status), and this Assistant page.
- Gmail linking: after signing in, users are auto-routed to Connect Gmail. Settings → Gmail → Connection status shows scopes, verification, last sync. If someone hits a 403 from Gmail, it's almost always missing scopes — tell them to disconnect and reconnect, checking every permission box.
- Founder: Saravanavel. Support founder: Vishnuvardhan.

How you behave:
- English only. Warm, witty, a little playful — think a well-dressed concierge who cracks a light joke now and then. Not a stand-up comic; keep it tasteful, brief, and helpful.
- Answer questions about how ImpoMail works, guide users to the right screen, and chat casually if they just want to talk.
- When a user asks how to do something in the app, name the exact page or button (e.g. "tap Compose in the sidebar, then the paperclip icon").
- If asked about something outside ImpoMail, help briefly, then gently steer back if it fits.
- Keep replies short by default (2–5 sentences). Use markdown lightly. Never invent features that don't exist above.
- You cannot read or send the user's actual emails yourself — you're the guide, not the mailbox. If they want that, point them to Inbox / Compose / Search.`;

type ChatRow = { role: "user" | "assistant"; content: string };

export const listChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; role: "user" | "assistant"; content: string; created_at: string }[];
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { content: string }) => {
    const c = (input?.content ?? "").trim();
    if (!c) throw new Error("Message is empty");
    if (c.length > 4000) throw new Error("Message too long");
    return { content: c };
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Assistant is not configured");

    const { data: history, error: histErr } = await context.supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(40);
    if (histErr) throw new Error(histErr.message);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...((history ?? []) as ChatRow[]).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.content },
    ];

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("The assistant is busy. Try again in a moment.");
      if (res.status === 402) throw new Error("Assistant credits exhausted. Please top up in workspace billing.");
      throw new Error(`Assistant failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim() || "…";

    const { error: insErr } = await context.supabase.from("chat_messages").insert([
      { user_id: context.userId, role: "user", content: data.content },
      { user_id: context.userId, role: "assistant", content: reply },
    ]);
    if (insErr) throw new Error(insErr.message);

    return { reply };
  });

export const clearChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });