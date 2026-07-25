import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/message-list";
import { GmailList } from "@/components/gmail-list";
import { listGmailMessages } from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/drafts")({
  head: () => ({ meta: [{ title: "Drafts — ImpoMail" }, { name: "description", content: "Your saved drafts." }] }),
  component: DraftsPage,
});

function DraftsPage() {
  const fetchFn = useServerFn(listGmailMessages);
  const { data, isLoading, error } = useQuery({
    queryKey: ["gmail", "drafts"],
    queryFn: () => fetchFn({ data: { labelIds: ["DRAFT"], maxResults: 30 } }),
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Drafts" />
      <GmailList items={data ?? []} loading={isLoading} error={error ? (error as Error).message : null} emptyText="No drafts saved." />
    </div>
  );
}