/** Shared, strict routing rules that decide which card/group a Gmail message belongs to. */

export type FilterableMessage = {
  id: string;
  from: string;
  to?: string;
  cc?: string;
  subject?: string;
};

export type FilterableCard = {
  id: string;
  kind: "card" | "group";
  addresses: { email: string }[];
};

export function cardTag(cardId: string): string {
  return `[impo:${cardId.slice(0, 8)}]`;
}

export function extractTag(subject: string | undefined): string | null {
  const m = (subject ?? "").match(/\[impo:([0-9a-zA-Z-]{4,12})\]/);
  return m ? m[1] : null;
}

function emailsIn(header: string | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const m = part.match(/<([^>]+)>/);
      return (m ? m[1] : part).trim().toLowerCase();
    })
    .filter((e) => e.includes("@"));
}

export function senderEmail(from: string): string {
  return emailsIn(from)[0] ?? from.trim().toLowerCase();
}

export function participants(msg: FilterableMessage): string[] {
  return [...emailsIn(msg.from), ...emailsIn(msg.to), ...emailsIn(msg.cc)];
}

/**
 * A message belongs to exactly one card:
 * - Tagged messages (sent from ImpoMail) go only to the card whose tag they carry.
 * - Untagged mail lands in a personal card when that card's single address is a
 *   participant. Groups only ever show mail sent through the group itself.
 */
export function messageBelongsToCard(
  msg: FilterableMessage,
  card: FilterableCard,
  myEmail?: string,
): boolean {
  const addrs = new Set(card.addresses.map((a) => a.email.toLowerCase()));
  if (addrs.size === 0) return false;
  const tag = extractTag(msg.subject);
  const mine = myEmail?.toLowerCase();
  const sender = senderEmail(msg.from);

  if (tag) {
    if (tag !== card.id.slice(0, 8)) return false;
    return addrs.has(sender) || (Boolean(mine) && sender === mine);
  }

  if (card.kind === "group") return false;
  return participants(msg).some((p) => addrs.has(p));
}

/** Pick the single best-matching card for a message, or null when it belongs to none. */
export function routeMessageToCard<T extends FilterableCard>(
  msg: FilterableMessage,
  cards: T[],
  myEmail?: string,
): T | null {
  const tag = extractTag(msg.subject);
  if (tag) return cards.find((c) => c.id.slice(0, 8) === tag) ?? null;
  return cards.find((c) => messageBelongsToCard(msg, c, myEmail)) ?? null;
}