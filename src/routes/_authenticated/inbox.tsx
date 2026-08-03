import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/message-list";
import { GmailList } from "@/components/gmail-list";
import { MailActions } from "@/components/mail-actions";
import { listGmailMessagesPage } from "@/lib/gmail.functions";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — ImpoMail" }, { name: "description", content: "Your Gmail inbox." }] }),
  component: InboxPage,
});

function InboxPage() {
  const fetchFn = useServerFn(listGmailMessagesPage);
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["gmail", "inbox-pages"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchFn({ data: { labelIds: ["INBOX"], maxResults: 50, pageToken: pageParam } }),
    getNextPageParam: (last) => last.nextPageToken ?? undefined,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const items = (data?.pages ?? []).flatMap((p) => p.items);
  const unread = items.filter((m) => m.unread).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
      <PageHeader
        title="Inbox"
        subtitle={isLoading ? "Loading…" : `${unread} unread · ${items.length} loaded${hasNextPage ? " · more available" : ""}`}
      />
      <GmailList
        items={items}
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyText="Your inbox is empty."
        renderActions={(m) => <MailActions id={m.id} actions={["archive", "trash"]} />}
      />
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="glass-card gold-hairline inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-primary transition hover:opacity-80 disabled:opacity-50"
          >
            {isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isFetchingNextPage ? "Loading" : "Load older mail"}
          </button>
        </div>
      )}
    </div>
  );
}
