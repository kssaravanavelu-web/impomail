import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/message-list";
import { GmailList } from "@/components/gmail-list";
import { listGmailMessages } from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — ImpoMail" }, { name: "description", content: "Your Gmail inbox." }] }),
  component: InboxPage,
});

function InboxPage() {
  const fetchFn = useServerFn(listGmailMessages);
  const { data, isLoading, error } = useQuery({
    queryKey: ["gmail", "inbox"],
    queryFn: () => fetchFn({ data: { labelIds: ["INBOX"], maxResults: 30 } }),
  });
  const items = data ?? [];
  const unread = items.filter((m) => m.unread).length;
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader title="Inbox" subtitle={isLoading ? "Loading…" : `${unread} unread · ${items.length} messages`} />
      <GmailList
        items={items}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyText="Your inbox is empty."
      />
    </div>
  );
}