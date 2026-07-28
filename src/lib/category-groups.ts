import type { Category } from "@/lib/mock-data";

export type CategoryGroup = { slug: string; label: string; short: string; cats: Category[] };

/** Top-level buckets shown on Home. Slugs are also valid /category/$slug routes. */
export const categoryGroups: CategoryGroup[] = [
  { slug: "payment", label: "Payments & Bills", short: "Payments and Bills", cats: ["payment"] },
  { slug: "otp", label: "OTP & Security", short: "OTP and Security", cats: ["otp"] },
  { slug: "jobs", label: "Jobs & Internships", short: "Jobs and Internships", cats: ["jobs"] },
  { slug: "recharges", label: "Recharges & Subscriptions", short: "Recharges and Subscriptions", cats: ["recharges"] },
  { slug: "personal", label: "Personal", short: "Personal", cats: ["personal"] },
  { slug: "promotions", label: "Promotions", short: "Promotions", cats: ["promotions"] },
  { slug: "updates", label: "Updates", short: "Updates", cats: ["updates"] },
  { slug: "travel", label: "Travel & Bookings", short: "Travel and Bookings", cats: ["travel"] },
];

export function resolveCategorySlug(slug: string): CategoryGroup | undefined {
  return categoryGroups.find((g) => g.slug === slug);
}
