import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMessagesTool from "./tools/list-messages";
import searchMessagesTool from "./tools/search-messages";
import getMessageTool from "./tools/get-message";
import getProfileTool from "./tools/get-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "impomail-mcp",
  title: "ImpoMail",
  version: "0.1.0",
  instructions:
    "Tools for ImpoMail — a smart email dashboard that categorizes messages (Business, Jobs, Internships, OTP Vault, Recharges). Use these tools to browse the signed-in user's messages, search them, or read a single message.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfileTool, listMessagesTool, searchMessagesTool, getMessageTool],
});