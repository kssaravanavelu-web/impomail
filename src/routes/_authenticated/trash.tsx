import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/message-list";
import { GmailList } from "@/components/gmail-list";
import { MailActions } from "@/components/mail-actions";
import { listGmailMessages } from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/trash")({
  head: () => ({ meta: [{ title: "Trash — ImpoMail" }, { name: "description", content: "Deleted messages." }] }),
  component: TrashPage,
});

function TrashPage() {
  const fetchFn = useServerFn(listGmailMessages);
  const { data, isLoading, error } = useQuery({
    queryKey: ["gmail", "trash"],
    queryFn: () => fetchFn({ data: { q: "in:trash", maxResults: 30 } }),
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Trash" subtitle="Messages are permanently deleted after 30 days." />
      <GmailList items={data ?? []} loading={isLoading} error={error ? (error as Error).message : null} emptyText="Trash is empty." renderActions={(m) => <MailActions id={m.id} actions={["restore"]} />} />
    </div>
  );
}