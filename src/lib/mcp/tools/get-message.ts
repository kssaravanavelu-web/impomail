import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { messages } from "@/lib/mock-data";

export default defineTool({
  name: "get_message",
  title: "Get message",
  description: "Fetch a single ImpoMail message by id, including its full body.",
  inputSchema: {
    id: z.string().min(1).describe("Message id from list_messages / search_messages."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const message = messages.find((m) => m.id === id);
    if (!message) {
      return { content: [{ type: "text", text: `No message with id ${id}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(message, null, 2) }],
      structuredContent: message,
    };
  },
});