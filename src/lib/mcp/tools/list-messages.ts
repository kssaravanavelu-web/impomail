import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { messages, type Category, type Folder } from "@/lib/mock-data";

const CATEGORIES = ["payment", "otp", "jobs", "recharges", "personal", "promotions", "updates", "travel"] as const;
const FOLDERS = ["inbox", "sent", "drafts", "trash", "archive"] as const;

export default defineTool({
  name: "list_messages",
  title: "List messages",
  description:
    "List the signed-in user's ImpoMail messages, optionally filtered by folder (default: inbox), category, unread, or starred. Returns a compact summary; use `get_message` for full body.",
  inputSchema: {
    folder: z.enum(FOLDERS).optional().describe("Folder to list. Defaults to inbox."),
    category: z.enum(CATEGORIES).optional().describe("Filter by category."),
    unreadOnly: z.boolean().optional().describe("Only return unread messages."),
    starredOnly: z.boolean().optional().describe("Only return starred messages."),
    limit: z.number().int().positive().optional().describe("Max messages to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const folder = (input.folder ?? "inbox") as Folder;
    const category = input.category as Category | undefined;
    const limit = input.limit ?? 25;

    const filtered = messages
      .filter((m) => m.folder === folder)
      .filter((m) => (category ? m.category === category : true))
      .filter((m) => (input.unreadOnly ? m.unread : true))
      .filter((m) => (input.starredOnly ? m.starred : true))
      .slice(0, limit)
      .map((m) => ({
        id: m.id,
        from: m.from,
        fromEmail: m.fromEmail,
        subject: m.subject,
        preview: m.preview,
        category: m.category,
        time: m.time,
        unread: m.unread,
        starred: m.starred,
      }));

    return {
      content: [{ type: "text", text: JSON.stringify({ count: filtered.length, messages: filtered }, null, 2) }],
      structuredContent: { count: filtered.length, messages: filtered },
    };
  },
});