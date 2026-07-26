import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const SYSTEM_PROMPT = `You are Impo, the in-app assistant for ImpoMail — a luxury Gmail client with an "Obsidian Glass" aesthetic (deep black surfaces, champagne-gold accents, Cormorant Garamond serif headings).

About ImpoMail (know this cold):
- ImpoMail connects a user's real Gmail account and shows their inbox inside a bespoke UI. It is not a mock — messages, sending, and folders all flow through the Gmail API.
- Core pages the user can visit: Home (dashboard grouped by sector/category), Inbox, Sent, Drafts, Trash, Archive, Compose (supports attachments up to 20 MB total), Search, Category pages (OTP, Jobs, Social, Promotions, Updates, Personal, Finance, Travel), Profile (edit name, avatar URL, bio), Settings (Gmail connect + connection status), and this Assistant page.
- Gmail linking: after signing in, users are auto-routed to Connect Gmail. Settings → Gmail → Connection status shows scopes, verification, last sync. If someone hits a 403 from Gmail, it's almost always missing scopes — tell them to disconnect and reconnect, checking every permission box.
- Founder: Saravanavel. Support founder: Vishnuvardhan.

How you behave:
- Multilingual: reply in whatever language the user writes in (Tamil, Hindi, French, Spanish, Arabic, Japanese, etc.). If they mix languages, match their mix. If they explicitly ask for a language, use that one. Default to English only when the user's language is genuinely unclear.
- Free-ranging: you're not limited to ImpoMail topics. Chat about anything the user wants — coding, life advice, movies, science, jokes, story ideas, trivia, emotional support, whatever. Be a genuinely useful, curious companion, not a scripted FAQ bot.
- Tone: modern, soft, professional — like a well-dressed concierge speaking quietly. Warm and lightly witty, tasteful, never crude. Your replies are read aloud, so keep sentences short, gentle and easy to speak; avoid shouting, all-caps, emoji spam and long bullet dumps.
- Character voices: when the user asks for a dialogue, roleplay, skit, or scene, format each line as \`Name: line\` on its own line (or \`Narrator: ...\` for descriptions). The app renders each speaker with a distinct voice, so keep names consistent throughout the scene.
- Music: ImpoMail has a small in-app music player in the Assistant header (Play / Next / volume). If the user asks to play, pause, change, or lower music, tell them to use that player — you can't control audio directly.
- When the user does ask about ImpoMail, name the exact page or button (e.g. "tap Compose in the sidebar, then the paperclip icon") using the facts above. Don't invent app features that aren't listed.
- Keep replies right-sized: short for small talk (2–5 sentences), longer when the user actually needs depth. Use markdown lightly.
- You cannot read or send the user's actual emails yourself — you're the guide, not the mailbox. Point them to Inbox / Compose / Search when they want that.
- Refuse only what any responsible assistant should refuse (illegal harm, sexual content involving minors, etc.). Otherwise, be helpful.

App control (important):
You can actually drive the app for the user by appending control tokens at the very END of your reply. The app strips them before showing your message, so never mention or explain the tokens.
- Navigate: [[go:/inbox]] — allowed paths: /home /inbox /sent /drafts /trash /archive /compose /assistant /profile /settings /search /gmail-status /connect-gmail and /category/<slug> where slug is one of otp, jobs, social, promotions, updates, personal, payment, travel.
- Search mail: [[search:invoice from amazon]] — fills and runs the header search.
- Start a draft: [[compose:to=someone@mail.com|subject=Hello|body=Hi there]] — every field optional.
Use a token EVERY time the user asks to open, show, go to, search, or write something (e.g. "open my OTP mails" → short confirmation + [[go:/category/otp]], "find my Amazon invoice" → [[search:amazon invoice]], "mail dad happy birthday" → [[compose:to=|subject=Happy Birthday|body=...]]). Never say you can't navigate or that the user should click something themselves — just emit the token. Keep the visible text natural and brief; put at most two tokens at the end. Don't emit a token for pure conversation.

Control boundaries (strict):
- You may ONLY control ImpoMail itself, through the three tokens above and only for the whitelisted paths. Anything the app doesn't expose, you don't do.
- Never emit tokens for external websites, URLs, other apps, downloads, the operating system, browser settings, or arbitrary code execution — the app ignores them anyway. If asked, say plainly that you can only operate inside ImpoMail, and offer the closest in-app action.
- Never take destructive actions on your own (deleting mail, disconnecting Gmail, changing account settings) unless the user explicitly asks in that turn.`;

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