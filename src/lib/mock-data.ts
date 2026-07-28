export type Category = "payment" | "otp" | "jobs" | "recharges" | "personal" | "promotions" | "updates" | "travel";

export const categoryMeta: Record<Category, { label: string; color: string; bg: string }> = {
  payment:    { label: "Payments & Bills",         color: "text-blue-300",    bg: "bg-blue-500/15 border-blue-500/30" },
  otp:        { label: "OTP & Security",           color: "text-amber-300",   bg: "bg-amber-500/15 border-amber-500/30" },
  jobs:       { label: "Jobs & Internships",       color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/30" },
  recharges:  { label: "Recharges & Subscriptions",color: "text-pink-300",    bg: "bg-pink-500/15 border-pink-500/30" },
  personal:   { label: "Personal",                 color: "text-cyan-300",    bg: "bg-cyan-500/15 border-cyan-500/30" },
  promotions: { label: "Promotions",               color: "text-rose-300",    bg: "bg-rose-500/15 border-rose-500/30" },
  updates:    { label: "Updates",                  color: "text-sky-300",     bg: "bg-sky-500/15 border-sky-500/30" },
  travel:     { label: "Travel & Bookings",        color: "text-violet-300",  bg: "bg-violet-500/15 border-violet-500/30" },
};

export type Folder = "inbox" | "sent" | "drafts" | "trash" | "archive";

export type Message = {
  id: string;
  from: string;
  fromEmail: string;
  to?: string;
  subject: string;
  preview: string;
  body: string;
  category: Category;
  folder: Folder;
  time: string;
  unread: boolean;
  starred: boolean;
};

export const messages: Message[] = [
  { id: "m1", from: "LinkedIn", fromEmail: "jobs@linkedin.com", subject: "5 new jobs matching Frontend Developer",
    preview: "New roles at Stripe, Vercel, and Linear match your profile.",
    body: "Hi Shyam,\n\nWe found 5 new job opportunities matching your interests in Frontend Development.\n\n• Stripe — Senior Frontend Engineer\n• Vercel — Product Engineer\n• Linear — UI Engineer\n\nView all on LinkedIn.",
    category: "jobs", folder: "inbox", time: "9:12 AM", unread: true, starred: false },
  { id: "m2", from: "Google", fromEmail: "no-reply@accounts.google.com", subject: "Your verification code is 483920",
    preview: "Use this code to complete sign-in. Expires in 10 minutes.",
    body: "Your Google verification code is: 483920\n\nThis code expires in 10 minutes. Don't share it with anyone.",
    category: "otp", folder: "inbox", time: "8:48 AM", unread: true, starred: false },
  { id: "m3", from: "Airtel", fromEmail: "care@airtel.in", subject: "Recharge successful — ₹299 plan activated",
    preview: "Your prepaid recharge of ₹299 is successful. Validity: 28 days.",
    body: "Dear Customer,\n\nYour recharge of ₹299 was successful.\nValidity: 28 days\nData: 1.5GB/day\nCalls: Unlimited",
    category: "recharges", folder: "inbox", time: "Yesterday", unread: false, starred: true },
  { id: "m4", from: "Internshala", fromEmail: "team@internshala.com", subject: "Product Design internship at Zomato",
    preview: "3-month remote internship. Stipend ₹25,000/month. Apply by Aug 5.",
    body: "A new Product Design internship at Zomato matches your profile.\n\nDuration: 3 months\nStipend: ₹25,000/month\nLocation: Remote\n\nApply by August 5.",
    category: "jobs", folder: "inbox", time: "Yesterday", unread: true, starred: false },
  { id: "m5", from: "Notion", fromEmail: "team@notion.so", subject: "Your Notion workspace invoice",
    preview: "Invoice #INV-8821 for July 2026 is ready.",
    body: "Your invoice for July 2026 is ready.\n\nAmount: $16.00\nPlan: Plus\n\nDownload from your billing dashboard.",
    category: "payment", folder: "inbox", time: "Mon", unread: false, starred: false },
  { id: "m6", from: "Amazon", fromEmail: "no-reply@amazon.in", subject: "OTP 991204 for your order",
    preview: "Please share this OTP with the delivery agent.",
    body: "Your delivery OTP is: 991204. Share only with the Amazon delivery agent.",
    category: "otp", folder: "inbox", time: "Mon", unread: false, starred: false },
  { id: "m7", from: "Stripe", fromEmail: "hiring@stripe.com", subject: "Interview invitation — Frontend Engineer",
    preview: "We'd love to schedule a technical interview next week.",
    body: "Hi Shyam,\n\nThank you for applying. We'd love to schedule a 60-minute technical interview next week. Please pick a slot from the link below.",
    category: "jobs", folder: "inbox", time: "Sun", unread: false, starred: true },
  { id: "m8", from: "Jio", fromEmail: "care@jio.com", subject: "Auto-recharge scheduled — ₹399",
    preview: "Your plan auto-renews on Jul 25, 2026.",
    body: "Your plan will auto-renew on Jul 25, 2026 for ₹399.",
    category: "recharges", folder: "inbox", time: "Sun", unread: false, starred: false },
  { id: "m9", from: "Figma", fromEmail: "team@figma.com", subject: "Weekly design digest",
    preview: "Top community files this week + new AI features.",
    body: "This week in Figma: new AI features, top community files, and upcoming events.",
    category: "promotions", folder: "inbox", time: "Jul 15", unread: false, starred: false },
  { id: "m10", from: "Me", fromEmail: "shyam@impomail.app", to: "friend@example.com", subject: "Re: Weekend plan",
    preview: "Sounds great — let's do Saturday brunch.",
    body: "Sounds great — let's do Saturday brunch. I'll book the table.",
    category: "personal", folder: "sent", time: "Yesterday", unread: false, starred: false },
  { id: "m11", from: "Draft", fromEmail: "shyam@impomail.app", subject: "Proposal draft — Q3 roadmap",
    preview: "Working on the Q3 roadmap proposal…",
    body: "Working on the Q3 roadmap proposal…",
    category: "payment", folder: "drafts", time: "Today", unread: false, starred: false },
  { id: "m12", from: "Old newsletter", fromEmail: "news@old.com", subject: "Unsubscribed",
    preview: "Moved to trash.",
    body: "This message was moved to trash.",
    category: "promotions", folder: "trash", time: "Jul 10", unread: false, starred: false },
  { id: "m13", from: "Coursera", fromEmail: "no-reply@coursera.org", subject: "Certificate ready to download",
    preview: "Your React Advanced certificate is ready.",
    body: "Congratulations! Your React Advanced course certificate is ready to download.",
    category: "updates", folder: "archive", time: "Jul 8", unread: false, starred: false },
];

export const metrics = [
  { key: "payment",     label: "Payment",     count: 24, category: "payment" as Category },
  { key: "jobs",        label: "Jobs",        count: 12, category: "jobs" as Category },
  { key: "travel",      label: "Travel",      count: 7,  category: "travel" as Category },
  { key: "otp",         label: "OTP Vault",   count: 38, category: "otp" as Category },
  { key: "recharges",   label: "Recharges",   count: 9,  category: "recharges" as Category },
];