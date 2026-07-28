import type { Category } from "@/lib/mock-data";

export type CategoryGroup = { slug: string; label: string; cats: Category[] };

/** Swipe-rail groups shown on Home. Slugs are also valid /category/$slug routes. */
export const categoryGroups: CategoryGroup[] = [
  { slug: "payment", label: "Payment", cats: ["payment"] },
  { slug: "career", label: "Career", cats: ["jobs", "internships"] },
  { slug: "education", label: "Education", cats: ["education"] },
  { slug: "otp", label: "OTP", cats: ["otp"] },
  { slug: "recharges", label: "Recharges", cats: ["recharges"] },
  { slug: "personal", label: "Personal", cats: ["personal"] },
  { slug: "others", label: "Others", cats: ["promotions", "updates"] },
];

export function resolveCategorySlug(slug: string): CategoryGroup | undefined {
  return categoryGroups.find((g) => g.slug === slug);
}
