export type TierKey = "free" | "pro" | "ultra";

export type TierConfig = {
  name: string;
  price: string;
  priceCents: number;
  period: string;
  description: string;
  features: string[];
  limits: {
    maxCards: number;
    maxGroups: number;
    maxGroupMembers: number;
    maxAiMessagesPerMonth: number;
    maxGmailAccounts: number;
  };
};

export const TIERS: Record<TierKey, TierConfig> = {
  free: {
    name: "Free",
    price: "$0",
    priceCents: 0,
    period: "forever",
    description: "Organize your Gmail essentials without paying a cent.",
    features: [
      "1 Gmail account",
      "3 personal cards",
      "1 group (up to 5 members)",
      "50 AI assistant messages / month",
      "Standard themes",
      "PWA notifications",
    ],
    limits: {
      maxCards: 3,
      maxGroups: 1,
      maxGroupMembers: 5,
      maxAiMessagesPerMonth: 50,
      maxGmailAccounts: 1,
    },
  },
  pro: {
    name: "Pro",
    price: "$7",
    priceCents: 700,
    period: "month",
    description: "For professionals who want a smarter, calmer inbox.",
    features: [
      "1 Gmail account",
      "50 personal cards",
      "20 groups (up to 100 members each)",
      "Unlimited AI assistant messages",
      "Premium themes & backgrounds",
      "Voice-to-search everywhere",
      "OTP vault history",
      "Priority sync",
    ],
    limits: {
      maxCards: 50,
      maxGroups: 20,
      maxGroupMembers: 100,
      maxAiMessagesPerMonth: Infinity,
      maxGmailAccounts: 1,
    },
  },
  ultra: {
    name: "Ultra",
    price: "$17",
    priceCents: 1700,
    period: "month",
    description: "For power users, teams, and anyone running multiple inboxes.",
    features: [
      "5 Gmail accounts",
      "Unlimited personal cards",
      "Unlimited groups (up to 100 members each)",
      "Unlimited AI assistant messages",
      "Premium & seasonal themes",
      "AI drafting templates",
      "Shared team inboxes",
      "Advanced analytics",
      "Webhook / API access",
      "White-glove support",
    ],
    limits: {
      maxCards: Infinity,
      maxGroups: Infinity,
      maxGroupMembers: 100,
      maxAiMessagesPerMonth: Infinity,
      maxGmailAccounts: 5,
    },
  },
};

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
