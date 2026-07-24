import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { messages } from "@/lib/mock-data";

export default defineTool({
  name: "search_messages",
  title: "Search messages",
  description: "Full-text search across the signed-in user's ImpoMail messages (subject, sender, preview, body).",
  inputSchema: {
    query: z.string().min(1).describe("Text to search for."),
    limit: z.number().int().positive().optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const q = query.toLowerCase();
    const results = messages
      .filter((m) =>
        [m.subject, m.from, m.fromEmail, m.preview, m.body].some((f) => f.toLowerCase().includes(q)),
      )
      .slice(0, limit ?? 20)
      .map((m) => ({
        id: m.id,
        from: m.from,
        subject: m.subject,
        preview: m.preview,
        category: m.category,
        folder: m.folder,
        time: m.time,
      }));

    return {
      content: [{ type: "text", text: JSON.stringify({ count: results.length, results }, null, 2) }],
      structuredContent: { count: results.length, results },
    };
  },
});