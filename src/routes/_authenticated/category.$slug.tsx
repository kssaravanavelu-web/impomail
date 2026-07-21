import { createFileRoute, notFound } from "@tanstack/react-router";
import { messages, categoryMeta, type Category } from "@/lib/mock-data";
import { MessageList, PageHeader } from "@/components/message-list";

export const Route = createFileRoute("/_authenticated/category/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${(categoryMeta as Record<string, { label: string }>)[params.slug]?.label ?? "Category"} — ImpoMail` },
      { name: "description", content: "Messages by category." },
    ],
  }),
  component: CategoryPage,
  notFoundComponent: () => <div className="p-8 text-center text-muted-foreground">Category not found.</div>,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const meta = (categoryMeta as Record<string, { label: string } | undefined>)[slug];
  if (!meta) throw notFound();
  const items = messages.filter((m) => m.category === (slug as Category));
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title={meta.label} subtitle={`${items.length} messages in this category`} />
      <MessageList items={items} emptyText={`No ${meta.label.toLowerCase()} messages.`} />
    </div>
  );
}