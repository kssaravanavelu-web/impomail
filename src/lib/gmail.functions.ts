import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_mail";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
];

export const startGmailConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((targetOrigin: string) => targetOrigin)
  .handler(async ({ data: targetOrigin, context }) => {
    const clientKey = process.env.GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY;
    if (!clientKey) throw new Error("Gmail connector is not configured");
    const { authorizeAppUserOAuth } = await import(
      "@/integrations/lovable/appUserConnector"
    );
    const { getConnectionKeyForUser } = await import(
      "./app-user-connections.server"
    );
    const existing = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientKey,
      returnUrl: `${targetOrigin}/connect-gmail`,
      responseMode: "web_message",
      webMessageTargetOrigin: targetOrigin,
      connectionAPIKey: existing ?? undefined,
      credentialsConfiguration: { scopes: GOOGLE_SCOPES },
    });
    return { authorizationUrl };
  });

export const saveGmailConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectionAPIKey: string }) => input)
  .handler(async ({ data, context }) => {
    const { saveConnectionKeyForUser } = await import(
      "./app-user-connections.server"
    );
    await saveConnectionKeyForUser(context.userId, CONNECTOR_ID, data.connectionAPIKey);
    return { ok: true };
  });

export const getGmailStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await import(
      "./app-user-connections.server"
    );
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) return { connected: false as const };
    try {
      const { callAsAppUser } = await import(
        "@/integrations/lovable/appUserConnector"
      );
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: key,
        connectorId: CONNECTOR_ID,
        path: "/gmail/v1/users/me/profile",
      });
      if (!res.ok) return { connected: true as const, email: null, messagesTotal: 0 };
      const p = (await res.json()) as { emailAddress?: string; messagesTotal?: number };
      return {
        connected: true as const,
        email: p.emailAddress ?? null,
        messagesTotal: p.messagesTotal ?? 0,
      };
    } catch {
      return { connected: true as const, email: null, messagesTotal: 0 };
    }
  });

export const disconnectGmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionKeyForUser } = await import(
      "./app-user-connections.server"
    );
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (key) {
      try {
        const { disconnectAppUser } = await import(
          "@/integrations/lovable/appUserConnector"
        );
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: CONNECTOR_ID,
        });
      } catch {
        // proceed with local cleanup even if gateway call fails
      }
      await deleteConnectionKeyForUser(context.userId, CONNECTOR_ID);
    }
    return { ok: true };
  });

export const getGmailConnectionDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, getConnectionMetadataForUser } = await import(
      "./app-user-connections.server"
    );
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    const metadata = await getConnectionMetadataForUser(context.userId, CONNECTOR_ID);
    if (!key) {
      return {
        connected: false as const,
        scopes: GOOGLE_SCOPES,
        verification: { status: "disconnected" as const, error: null },
        lastSyncAt: null,
        createdAt: null,
        email: null,
        messagesTotal: 0,
      };
    }
    try {
      const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: key,
        connectorId: CONNECTOR_ID,
        path: "/gmail/v1/users/me/profile",
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          connected: true as const,
          scopes: GOOGLE_SCOPES,
          verification: { status: "failed" as const, error: `Google API returned ${res.status}: ${body.slice(0, 200)}` },
          lastSyncAt: metadata?.updated_at ?? null,
          createdAt: metadata?.created_at ?? null,
          email: null,
          messagesTotal: 0,
        };
      }
      const p = (await res.json()) as { emailAddress?: string; messagesTotal?: number };
      return {
        connected: true as const,
        scopes: GOOGLE_SCOPES,
        verification: { status: "verified" as const, error: null },
        lastSyncAt: metadata?.updated_at ?? null,
        createdAt: metadata?.created_at ?? null,
        email: p.emailAddress ?? null,
        messagesTotal: p.messagesTotal ?? 0,
      };
    } catch (e) {
      return {
        connected: true as const,
        scopes: GOOGLE_SCOPES,
        verification: { status: "failed" as const, error: e instanceof Error ? e.message : "Connection test failed" },
        lastSyncAt: metadata?.updated_at ?? null,
        createdAt: metadata?.created_at ?? null,
        email: null,
        messagesTotal: 0,
      };
    }
  });

export type GmailMessageSummary = {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  unread: boolean;
  category: import("@/lib/mock-data").Category;
};

export const listGmailMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { q?: string; maxResults?: number; labelIds?: string[] } | undefined) => input ?? {},
  )
  .handler(async ({ data, context }): Promise<GmailMessageSummary[]> => {
    const { getConnectionKeyForUser } = await import(
      "./app-user-connections.server"
    );
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) return [];
    const { callAsAppUser } = await import(
      "@/integrations/lovable/appUserConnector"
    );
    const { categorizeGmail } = await import("./categorize");
    const params = new URLSearchParams();
    params.set("maxResults", String(Math.min(data.maxResults ?? 20, 50)));
    if (data.q) params.set("q", data.q);
    for (const l of data.labelIds ?? []) params.append("labelIds", l);
    const listRes = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: `/gmail/v1/users/me/messages?${params}`,
    });
    if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
    const list = (await listRes.json()) as { messages?: { id: string; threadId: string }[] };
    if (!list.messages?.length) return [];
    const detailed = await Promise.all(
      list.messages.slice(0, 20).map(async (m) => {
        const r = await callAsAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: CONNECTOR_ID,
          path: `/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        });
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
        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: msg.snippet ?? "",
          from,
          subject,
          date: h("Date") || (msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : ""),
          unread: (msg.labelIds ?? []).includes("UNREAD"),
          category: categorizeGmail(from, subject),
        } satisfies GmailMessageSummary;
      }),
    );
    return detailed.filter((x): x is GmailMessageSummary => x !== null);
  });

export type GmailMessageFull = {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml: string;
  unread: boolean;
  category: import("@/lib/mock-data").Category;
};

function decodeB64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? b64 + "=".repeat(4 - (b64.length % 4)) : b64;
  try {
    return Buffer.from(pad, "base64").toString("utf8");
  } catch {
    return "";
  }
}

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};

function extractBodies(part: GmailPart | undefined): { text: string; html: string } {
  if (!part) return { text: "", html: "" };
  let text = "";
  let html = "";
  const walk = (p: GmailPart) => {
    if (p.body?.data) {
      const decoded = decodeB64Url(p.body.data);
      if (p.mimeType === "text/plain" && !text) text = decoded;
      else if (p.mimeType === "text/html" && !html) html = decoded;
    }
    for (const c of p.parts ?? []) walk(c);
  };
  walk(part);
  return { text, html };
}

export const getGmailMessage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<GmailMessageFull | null> => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) return null;
    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
    const { categorizeGmail } = await import("./categorize");
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: `/gmail/v1/users/me/messages/${data.id}?format=full`,
    });
    if (!res.ok) throw new Error(`Gmail get failed: ${res.status}`);
    const msg = (await res.json()) as {
      id: string;
      threadId: string;
      labelIds?: string[];
      internalDate?: string;
      payload?: GmailPart & { headers?: { name: string; value: string }[] };
    };
    const h = (n: string) =>
      msg.payload?.headers?.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
    const from = h("From");
    const subject = h("Subject");
    const emailMatch = from.match(/<([^>]+)>/);
    const fromEmail = emailMatch ? emailMatch[1] : from;
    const fromName = from.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || fromEmail;
    const { text, html } = extractBodies(msg.payload);
    return {
      id: msg.id,
      threadId: msg.threadId,
      from: fromName,
      fromEmail,
      to: h("To"),
      subject,
      date: h("Date") || (msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : ""),
      bodyText: text,
      bodyHtml: html,
      unread: (msg.labelIds ?? []).includes("UNREAD"),
      category: categorizeGmail(from, subject),
    };
  });

export type SendAttachmentInput = {
  filename: string;
  mimeType: string;
  dataBase64: string; // raw base64 (no data: prefix)
};

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function rawBase64ToUrl(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildMime(opts: {
  to: string;
  subject: string;
  body: string;
  attachments: SendAttachmentInput[];
}): string {
  const boundary = `impomail_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
  ];
  if (!opts.attachments.length) {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    return `${headers.join("\r\n")}\r\n\r\n${opts.body}`;
  }
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  const parts: string[] = [];
  parts.push(
    `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${opts.body}`,
  );
  for (const a of opts.attachments) {
    const b64 = rawBase64ToUrl(a.dataBase64)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const wrapped = b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
    parts.push(
      `--${boundary}\r\nContent-Type: ${a.mimeType}; name="${a.filename}"\r\nContent-Disposition: attachment; filename="${a.filename}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrapped}`,
    );
  }
  parts.push(`--${boundary}--`);
  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
}

export const sendGmailMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      to: string;
      subject: string;
      body: string;
      attachments?: SendAttachmentInput[];
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("./app-user-connections.server");
    const key = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) throw new Error("Gmail is not connected");
    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
    const mime = buildMime({
      to: data.to,
      subject: data.subject,
      body: data.body,
      attachments: data.attachments ?? [],
    });
    const raw = encodeBase64Url(mime);
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: "/gmail/v1/users/me/messages/send",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gmail send failed [${res.status}]: ${body.slice(0, 300)}`);
    }
    return { ok: true as const };
  });