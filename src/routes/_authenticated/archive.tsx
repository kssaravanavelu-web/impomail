import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/message-list";
import { GmailList } from "@/components/gmail-list";
import { MailActions } from "@/components/mail-actions";
import { listGmailMessages } from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/archive")({
  head: () => ({ meta: [{ title: "Archive — ImpoMail" }, { name: "description", content: "Archived messages." }] }),
  component: ArchivePage,
});

function ArchivePage() {
  const fetchFn = useServerFn(listGmailMessages);
  const { data, isLoading, error } = useQuery({
    queryKey: ["gmail", "archive"],
    queryFn: () => fetchFn({ data: { q: "-in:inbox -in:sent -in:drafts -in:trash -in:spam", maxResults: 30 } }),
  });
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Archive" subtitle="Long-term storage for important mail." />
      <GmailList items={data ?? []} loading={isLoading} error={error ? (error as Error).message : null} emptyText="Nothing archived yet." renderActions={(m) => <MailActions id={m.id} actions={["unarchive", "trash"]} />} />
    </div>
  );
}