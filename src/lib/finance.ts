/** Client-safe finance constants and helpers. */

export const EXPENSE_CATEGORIES = [
  "food",
  "groceries",
  "travel",
  "fuel",
  "shopping",
  "medical",
  "entertainment",
  "education",
  "subscriptions",
  "utilities",
  "salary",
  "freelancing",
  "investments",
  "insurance",
  "emi",
  "rent",
  "tax",
  "transfer",
  "other",
] as const;

export type FinanceCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<FinanceCategory, string> = {
  food: "Food",
  groceries: "Groceries",
  travel: "Travel",
  fuel: "Fuel",
  shopping: "Shopping",
  medical: "Medical",
  entertainment: "Entertainment",
  education: "Education",
  subscriptions: "Subscriptions",
  utilities: "Utilities",
  salary: "Salary",
  freelancing: "Freelancing",
  investments: "Investments",
  insurance: "Insurance",
  emi: "EMI",
  rent: "Rent",
  tax: "Tax",
  transfer: "Transfer",
  other: "Other",
};

/** Categories that make sense as budget lines. */
export const BUDGET_CATEGORIES: FinanceCategory[] = [
  "food",
  "fuel",
  "shopping",
  "entertainment",
  "utilities",
  "travel",
  "groceries",
  "subscriptions",
];

export const INCOME_CATEGORIES: FinanceCategory[] = ["salary", "freelancing", "investments"];

export const BILL_TYPES = [
  "electricity",
  "gas",
  "water",
  "broadband",
  "mobile",
  "insurance",
  "credit_card",
  "emi",
  "other",
] as const;
export type BillType = (typeof BILL_TYPES)[number];

export const BILL_TYPE_LABEL: Record<BillType, string> = {
  electricity: "Electricity",
  gas: "Gas",
  water: "Water",
  broadband: "Broadband",
  mobile: "Mobile recharge",
  insurance: "Insurance",
  credit_card: "Credit card due",
  emi: "EMI",
  other: "Other",
};

/** Deterministic hue per category so charts stay stable across renders. */
export function categoryHue(category: string): number {
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) % 360;
  return h;
}

export function categoryColor(category: string): string {
  return `oklch(0.75 0.12 ${categoryHue(category)})`;
}

export function formatMoney(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function monthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export type Transaction = {
  id: string;
  direction: "debit" | "credit";
  amount: number;
  currency: string;
  merchant: string | null;
  counterparty: string | null;
  sender: string | null;
  occurred_at: string;
  txn_ref: string | null;
  upi_ref: string | null;
  payment_method: string | null;
  category: FinanceCategory;
  category_locked: boolean;
  account_hint: string | null;
  has_invoice: boolean;
  confidence: number;
  gmail_message_id: string | null;
  gmail_thread_id: string | null;
  source: string;
  notes: string | null;
};

export type Budget = {
  id: string;
  category: FinanceCategory;
  amount: number;
  currency: string;
};

export type Bill = {
  id: string;
  biller: string;
  bill_type: BillType;
  amount: number;
  currency: string;
  due_date: string | null;
  status: "unpaid" | "paid" | "overdue";
  gmail_message_id: string | null;
};

export type Subscription = {
  id: string;
  name: string;
  merchant: string | null;
  amount: number;
  currency: string;
  cadence: string;
  next_renewal_at: string | null;
  last_charged_at: string | null;
  status: string;
};

export type Insight = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  severity: "info" | "warning" | "critical" | "success";
  created_at: string;
};