import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/message-list";
import { GmailList } from "@/components/gmail-list";
import { listGmailMessages } from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/sent")({
  head: () => ({ meta: [{ title: "Sent — ImpoMail" }, { name: "description", content: "Messages you've sent." }] }),
  component: SentPage,
});

function SentPage() {
  const fetchFn = useServerFn(listGmailMessages);
  const { data, isLoading, error } = useQuery({
    queryKey: ["gmail", "sent"],
    queryFn: () => fetchFn({ data: { labelIds: ["SENT"], maxResults: 30 } }),
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Sent" />
      <GmailList items={data ?? []} loading={isLoading} error={error ? (error as Error).message : null} emptyText="You haven't sent any mail yet." />
    </div>
  );
}