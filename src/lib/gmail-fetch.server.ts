import { callAsAppUser } from "@/integrations/lovable/appUserConnector";
import { classify, priorityScore } from "./categorize";
import type { Category } from "@/lib/mock-data";
import type { GmailMessageSummary } from "./gmail.functions";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_mail";

type Rule = { pattern: string; category: Category };

async function gmail(key: string, path: string) {
  return callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey: key,
    connectorId: CONNECTOR_ID,
    path,
  });
}

export async function fetchMessagePage(opts: {
  key: string;
  rules: Rule[];
  q?: string;
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
}): Promise<{ items: GmailMessageSummary[]; nextPageToken: string | null }> {
  const params = new URLSearchParams();
  params.set("maxResults", String(Math.min(Math.max(opts.maxResults ?? 25, 1), 100)));
  if (opts.q) params.set("q", opts.q);
  if (opts.pageToken) params.set("pageToken", opts.pageToken);
  for (const l of opts.labelIds ?? []) params.append("labelIds", l);

  const listRes = await gmail(opts.key, `/gmail/v1/users/me/messages?${params}`);
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
  const list = (await listRes.json()) as {
    messages?: { id: string; threadId: string }[];
    nextPageToken?: string;
  };
  const nextPageToken = list.nextPageToken ?? null;
  if (!list.messages?.length) return { items: [], nextPageToken };

  const detailed = await Promise.all(
    list.messages.map(async (m) => {
      const r = await gmail(
        opts.key,
        `/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=List-Unsubscribe&metadataHeaders=Precedence`,
      );
      if (!r.ok) return null;
      const msg = (await r.json()) as {
        id: string;
        threadId: string;
        snippet?: string;
        labelIds?: string[];
        payload?: { headers?: { name: string; value: string }[] };
        internalDate?: string;
      };
      const h = (n: string) =>
        msg.payload?.headers?.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
      const from = h("From");
      const subject = h("Subject");
      const snippet = msg.snippet ?? "";
      const date =
        h("Date") || (msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : "");
      const unread = (msg.labelIds ?? []).includes("UNREAD");
      const result = classify(
        { from, subject, snippet, listUnsubscribe: h("List-Unsubscribe"), precedence: h("Precedence") },
        opts.rules,
      );
      return {
        id: msg.id,
        threadId: msg.threadId,
        snippet,
        from,
        to: h("To"),
        cc: h("Cc"),
        subject,
        date,
        unread,
        category: result.category ?? ("personal" as Category),
        needsAI: result.category === null,
        priority: priorityScore({
          from,
          subject,
          snippet,
          category: result.category ?? "personal",
          date,
          unread,
        }),
      };
    }),
  );
  const items = detailed.filter((x): x is NonNullable<(typeof detailed)[number]> => x !== null);

  const ambiguous = items.filter((i) => i.needsAI);
  if (ambiguous.length) {
    const { classifyWithAI } = await import("./ai-classify.server");
    const guessed = await classifyWithAI(
      ambiguous.map((a) => ({ id: a.id, from: a.from, subject: a.subject, snippet: a.snippet })),
    );
    for (const item of items) {
      const g = guessed[item.id];
      if (g) {
        item.category = g;
        item.priority = priorityScore({
          from: item.from,
          subject: item.subject,
          snippet: item.snippet,
          category: g,
          date: item.date,
          unread: item.unread,
        });
      }
    }
  }

  return {
    items: items.map(({ needsAI: _needsAI, ...rest }) => rest satisfies GmailMessageSummary),
    nextPageToken,
  };
}

/** Counts message ids matching a query, walking pages (capped) — no per-message fetch. */
export async function countMessages(key: string, q: string, maxPages = 6): Promise<number> {
  let token: string | undefined;
  let count = 0;
  for (let i = 0; i < maxPages; i++) {
    const params = new URLSearchParams({ maxResults: "500", q });
    if (token) params.set("pageToken", token);
    const res = await gmail(key, `/gmail/v1/users/me/messages?${params}`);
    if (!res.ok) break;
    const data = (await res.json()) as { messages?: unknown[]; nextPageToken?: string };
    count += data.messages?.length ?? 0;
    if (!data.nextPageToken) break;
    token = data.nextPageToken;
  }
  return count;
}
