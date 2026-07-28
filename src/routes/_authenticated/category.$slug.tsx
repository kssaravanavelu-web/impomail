import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { categoryMeta, type Category } from "@/lib/mock-data";
import { resolveCategorySlug } from "@/lib/category-groups";
import { PageHeader } from "@/components/message-list";
import { GmailList } from "@/components/gmail-list";
import { listGmailMessages } from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${resolveCategorySlug(params.slug)?.label ?? (categoryMeta as Record<string, { label: string }>)[params.slug]?.label ?? "Category"} — ImpoMail` },
      { name: "description", content: "Messages by category." },
    ],
  }),
  component: CategoryPage,
  notFoundComponent: () => <div className="p-8 text-center text-muted-foreground">Category not found.</div>,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const group = resolveCategorySlug(slug);
  const single = (categoryMeta as Record<string, { label: string } | undefined>)[slug];
  const label = group?.label ?? single?.label;
  const cats: Category[] = group?.cats ?? (single ? [slug as Category] : []);
  if (!label) throw notFound();
  const fetchFn = useServerFn(listGmailMessages);
  const { data, isLoading, error } = useQuery({
    queryKey: ["gmail", "inbox-all"],
    queryFn: () => fetchFn({ data: { labelIds: ["INBOX"], maxResults: 50 } }),
  });
  const items = (data ?? []).filter((m) => cats.includes(m.category as Category));
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title={label} subtitle={isLoading ? "Loading…" : `${items.length} messages in this category`} />
      <GmailList items={items} loading={isLoading} error={error ? (error as Error).message : null} emptyText={`No ${label.toLowerCase()} messages.`} />
    </div>
  );
}