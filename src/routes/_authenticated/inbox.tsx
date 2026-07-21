import { createFileRoute } from "@tanstack/react-router";
import { messages } from "@/lib/mock-data";
import { MessageList, PageHeader } from "@/components/message-list";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — ImpoMail" }, { name: "description", content: "Your inbox." }] }),
  component: () => {
    const items = messages.filter((m) => m.folder === "inbox");
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">
        <PageHeader title="Inbox" subtitle={`${items.filter((m) => m.unread).length} unread`} />
        <MessageList items={items} emptyText="Your inbox is empty." />
      </div>
    );
  },
});